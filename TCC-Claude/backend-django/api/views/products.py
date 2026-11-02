import json
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction, IntegrityError

from api.models import Product, Movement
from api.decorators import exige_permissao
from api.permissions import can


def _log_movement(product_id, product_nome, tipo, quantidade, user, origem='estoque', detalhes=None):
    Movement.objects.create(
        product_id=product_id,
        product_nome=product_nome,
        tipo=tipo,
        quantidade=quantidade,
        user_id=user['id'],
        user_nome=user['nome'],
        tenant_id=user['tenant_id'],
        origem=origem,
        detalhes=detalhes,
    )


def _parse_qty(value, allow_zero=False):
    try:
        q = Decimal(str(value))
        if allow_zero and q >= 0:
            return q, None
        if q > 0:
            return q, None
        return None, 'invalido'
    except (InvalidOperation, TypeError):
        return None, 'invalido'


def _create_or_stack(item_body, user):
    """
    Creates a new product or stacks quantity into an existing one (when nfe_chave matches
    an existing product name). Must be called inside transaction.atomic().
    Returns ('criado'|'empilhado', product).
    Raises ValueError on validation failure.
    """
    nome = str(item_body.get('nome', '')).strip()
    unidade = str(item_body.get('unidade', '')).strip()
    if not nome:
        raise ValueError('Nome é obrigatório.')
    if not unidade:
        raise ValueError('Unidade é obrigatória.')

    qty, err = _parse_qty(item_body.get('quantidade'))
    if err:
        raise ValueError('Quantidade deve ser um número maior que zero.')

    peso = None
    if item_body.get('peso_kg') not in (None, ''):
        try:
            peso = Decimal(str(item_body['peso_kg']))
        except (InvalidOperation, TypeError):
            peso = None

    nfe_chave = str(item_body.get('nfe_chave', '')).strip() or None
    detalhes = {'nfe_chave': nfe_chave} if nfe_chave else None

    if nfe_chave:
        existing = Product.objects.filter(
            tenant_id=user['tenant_id'], arquivado=False, nome__iexact=nome,
        ).select_for_update().first()
        if existing:
            existing.quantidade += qty
            existing.save()
            _log_movement(existing.id, existing.nome, 'entrada', qty, user, detalhes=detalhes)
            return 'empilhado', existing

    p = Product.objects.create(
        nome=nome,
        quantidade=qty,
        unidade=unidade,
        peso_kg=peso,
        categoria=str(item_body.get('categoria', '')).strip() or None,
        fornecedor=str(item_body.get('fornecedor', '')).strip() or None,
        codigo_barras=str(item_body.get('codigo_barras', '')).strip() or None,
        tenant_id=user['tenant_id'],
    )
    _log_movement(p.id, nome, 'entrada', qty, user, detalhes=detalhes)
    return 'criado', p


@csrf_exempt
def products_list_create(request):
    if request.method == 'GET':
        return _list_products(request)
    elif request.method == 'POST':
        return _create_product(request)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)


def _list_products(request):
    user = request.user_data
    ver_arquivados = request.GET.get('arquivados') == '1'

    if ver_arquivados and not can(user['role'], 'produto:ver-arquivados'):
        return JsonResponse({'message': 'Você não tem permissão para esta ação.'}, status=403)

    if ver_arquivados:
        qs = Product.objects.filter(tenant_id=user['tenant_id'], arquivado=True).order_by('-arquivado_em')
        fields = ['id', 'nome', 'quantidade', 'unidade', 'peso_kg', 'categoria', 'fornecedor', 'arquivado', 'arquivado_em', 'created_at']
    else:
        qs = Product.objects.filter(tenant_id=user['tenant_id'], arquivado=False).order_by('-created_at')
        fields = ['id', 'nome', 'quantidade', 'unidade', 'peso_kg', 'categoria', 'fornecedor', 'created_at']

    page_str = request.GET.get('page')
    page_size_str = request.GET.get('page_size')
    if page_str is not None and page_size_str is not None:
        try:
            page = max(1, int(page_str))
            page_size = min(100, max(1, int(page_size_str)))
        except (ValueError, TypeError):
            return JsonResponse({'message': 'Parâmetros de paginação inválidos.'}, status=400)
        offset = (page - 1) * page_size
        rows = list(qs.values(*fields)[offset:offset + page_size])
    else:
        rows = list(qs.values(*fields))

    for r in rows:
        for k, v in r.items():
            if isinstance(v, Decimal):
                r[k] = float(v)
            elif hasattr(v, 'isoformat'):
                r[k] = v.isoformat()
    return JsonResponse(rows, safe=False)


@exige_permissao('produto:cadastrar')
def _create_product(request):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    try:
        with transaction.atomic():
            _, p = _create_or_stack(body, user)
    except ValueError as e:
        return JsonResponse({'message': str(e)}, status=400)

    return JsonResponse({'id': p.id, 'message': 'Produto criado com sucesso.'}, status=201)


@csrf_exempt
@require_http_methods(['POST'])
@exige_permissao('produto:cadastrar')
def products_batch(request):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    itens = body.get('itens')
    if not isinstance(itens, list) or len(itens) == 0:
        return JsonResponse({'message': 'A lista de itens não pode ser vazia.'}, status=400)

    batch_limit = getattr(settings, 'NFE_BATCH_LIMIT', 500)
    if len(itens) > batch_limit:
        return JsonResponse(
            {'message': f'O lote excede o limite de {batch_limit} itens.'},
            status=400,
        )

    # Deduplicação: rejeita se qualquer nfe_chave do lote já foi importada para este tenant
    nfe_chaves = {str(i.get('nfe_chave', '') or '').strip() for i in itens}
    nfe_chaves.discard('')
    if nfe_chaves:
        duplicata = Movement.objects.filter(
            tenant_id=user['tenant_id'],
            detalhes__nfe_chave__in=list(nfe_chaves),
        ).exists()
        if duplicata:
            return JsonResponse({'message': 'Esta NF-e já foi importada.'}, status=409)

    criados = empilhados = 0
    try:
        with transaction.atomic():
            for item in itens:
                resultado, _ = _create_or_stack(item, user)
                if resultado == 'criado':
                    criados += 1
                else:
                    empilhados += 1
    except ValueError as e:
        return JsonResponse({'message': str(e)}, status=400)

    return JsonResponse({'criados': criados, 'empilhados': empilhados}, status=201)


@csrf_exempt
def product_detail(request, pk):
    if request.method == 'PUT':
        return _update_product(request, pk)
    elif request.method == 'DELETE':
        return _delete_product(request, pk)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)


@exige_permissao('produto:editar')
def _update_product(request, pk):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    try:
        p = Product.objects.get(id=int(pk), tenant_id=user['tenant_id'])
    except Product.DoesNotExist:
        return JsonResponse({'message': 'Produto não encontrado.'}, status=404)
    if p.arquivado:
        return JsonResponse({'message': 'Produto arquivado.'}, status=409)

    nome = str(body.get('nome', '')).strip()
    unidade = str(body.get('unidade', '')).strip()
    if not nome:
        return JsonResponse({'message': 'Nome é obrigatório.'}, status=400)
    if not unidade:
        return JsonResponse({'message': 'Unidade é obrigatória.'}, status=400)

    qty, err = _parse_qty(body.get('quantidade'), allow_zero=True)
    if err:
        return JsonResponse({'message': 'Quantidade deve ser um número maior ou igual a zero.'}, status=400)

    novo = {
        'nome': nome,
        'quantidade': qty,
        'unidade': unidade,
        'categoria': str(body.get('categoria', '')).strip() or None,
        'fornecedor': str(body.get('fornecedor', '')).strip() or None,
    }
    antes, depois = {}, {}
    campos = ['nome', 'quantidade', 'unidade', 'categoria', 'fornecedor']
    for campo in campos:
        a = float(getattr(p, campo)) if campo == 'quantidade' and getattr(p, campo) is not None else getattr(p, campo)
        n = float(novo[campo]) if campo == 'quantidade' else novo[campo]
        if a != n:
            antes[campo] = a
            depois[campo] = n

    for campo, valor in novo.items():
        setattr(p, campo, valor)
    p.save()

    if depois:
        _log_movement(p.id, nome, 'edicao', abs(depois.get('quantidade', 0) - antes.get('quantidade', 0)) if 'quantidade' in depois else 0, user, detalhes={'antes': antes, 'depois': depois})

    return JsonResponse({'message': 'Produto atualizado com sucesso.'})


@exige_permissao('produto:excluir')
def _delete_product(request, pk):
    user = request.user_data
    try:
        p = Product.objects.get(id=int(pk), tenant_id=user['tenant_id'])
    except Product.DoesNotExist:
        return JsonResponse({'message': 'Produto não encontrado.'}, status=404)

    nome, qtd = p.nome, p.quantidade
    try:
        p.delete()
    except IntegrityError as e:
        if '23503' in str(e) or 'foreign key' in str(e).lower():
            return JsonResponse({'message': 'Produto vinculado a pedidos e não pode ser removido.'}, status=409)
        raise

    _log_movement(int(pk), nome, 'remocao', float(qtd), user)
    return JsonResponse({'message': 'Produto removido com sucesso.'})


@csrf_exempt
@require_http_methods(['POST'])
@exige_permissao('produto:retirar')
def product_withdraw(request, pk):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    qty, err = _parse_qty(body.get('quantidade'))
    if err:
        return JsonResponse({'message': 'Quantidade inválida.'}, status=400)

    with transaction.atomic():
        try:
            p = Product.objects.select_for_update().get(id=int(pk), tenant_id=user['tenant_id'])
        except Product.DoesNotExist:
            return JsonResponse({'message': 'Produto não encontrado.'}, status=404)
        if p.arquivado:
            return JsonResponse({'message': 'Produto arquivado.'}, status=409)
        if p.quantidade < qty:
            return JsonResponse({'message': f'Estoque insuficiente. Disponível: {float(p.quantidade)}.'}, status=400)

        p.quantidade -= qty
        p.save()
        _log_movement(p.id, p.nome, 'saida', qty, user)

    return JsonResponse({'message': 'Retirada registrada com sucesso.'})


@csrf_exempt
@require_http_methods(['POST'])
@exige_permissao('produto:entrada')
def product_entry(request, pk):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    qty, err = _parse_qty(body.get('quantidade'))
    if err:
        return JsonResponse({'message': 'Quantidade deve ser um número maior que zero.'}, status=400)

    with transaction.atomic():
        try:
            p = Product.objects.select_for_update().get(id=int(pk), tenant_id=user['tenant_id'])
        except Product.DoesNotExist:
            return JsonResponse({'message': 'Produto não encontrado.'}, status=404)
        if p.arquivado:
            return JsonResponse({'message': 'Produto arquivado.'}, status=409)

        p.quantidade += qty
        p.save()
        _log_movement(p.id, p.nome, 'entrada', qty, user, origem='estoque')

    return JsonResponse({'message': 'Entrada registrada com sucesso.'})


@csrf_exempt
@require_http_methods(['POST'])
@exige_permissao('produto:arquivar')
def product_archive(request, pk):
    user = request.user_data
    try:
        p = Product.objects.get(id=int(pk), tenant_id=user['tenant_id'])
    except Product.DoesNotExist:
        return JsonResponse({'message': 'Produto não encontrado.'}, status=404)
    if p.arquivado:
        return JsonResponse({'message': 'Produto já está arquivado.'}, status=409)

    from django.utils import timezone
    p.arquivado = True
    p.arquivado_em = timezone.now()
    p.save()
    _log_movement(p.id, p.nome, 'edicao', 0, user, detalhes={'antes': {'arquivado': False}, 'depois': {'arquivado': True}})
    return JsonResponse({'message': 'Produto arquivado.'})


@csrf_exempt
@require_http_methods(['POST'])
@exige_permissao('produto:restaurar')
def product_restore(request, pk):
    user = request.user_data
    try:
        p = Product.objects.get(id=int(pk), tenant_id=user['tenant_id'])
    except Product.DoesNotExist:
        return JsonResponse({'message': 'Produto não encontrado.'}, status=404)
    if not p.arquivado:
        return JsonResponse({'message': 'Produto não está arquivado.'}, status=409)

    p.arquivado = False
    p.arquivado_em = None
    p.save()
    _log_movement(p.id, p.nome, 'edicao', 0, user, detalhes={'antes': {'arquivado': True}, 'depois': {'arquivado': False}})
    return JsonResponse({'message': 'Produto restaurado.'})
