import json
from decimal import Decimal, InvalidOperation
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

    nome = str(body.get('nome', '')).strip()
    unidade = str(body.get('unidade', '')).strip()
    if not nome:
        return JsonResponse({'message': 'Nome é obrigatório.'}, status=400)
    if not unidade:
        return JsonResponse({'message': 'Unidade é obrigatória.'}, status=400)

    qty, err = _parse_qty(body.get('quantidade'))
    if err:
        return JsonResponse({'message': 'Quantidade deve ser um número maior que zero.'}, status=400)

    peso = None
    if body.get('peso_kg') not in (None, ''):
        try:
            peso = Decimal(str(body['peso_kg']))
        except (InvalidOperation, TypeError):
            peso = None

    nfe_chave = str(body.get('nfe_chave', '')).strip() or None
    detalhes = {'nfe_chave': nfe_chave} if nfe_chave else None

    # NF-e: se já existe produto com mesmo nome, empilha a quantidade em vez de duplicar
    if nfe_chave:
        existing = Product.objects.filter(
            tenant_id=user['tenant_id'], arquivado=False, nome__iexact=nome,
        ).first()
        if existing:
            with transaction.atomic():
                p = Product.objects.select_for_update().get(id=existing.id)
                p.quantidade += qty
                p.save()
                _log_movement(p.id, p.nome, 'entrada', qty, user, detalhes=detalhes)
            return JsonResponse({'id': p.id, 'message': 'Produto criado com sucesso.'}, status=201)

    p = Product.objects.create(
        nome=nome,
        quantidade=qty,
        unidade=unidade,
        peso_kg=peso,
        categoria=str(body.get('categoria', '')).strip() or None,
        fornecedor=str(body.get('fornecedor', '')).strip() or None,
        codigo_barras=str(body.get('codigo_barras', '')).strip() or None,
        tenant_id=user['tenant_id'],
    )
    _log_movement(p.id, nome, 'entrada', qty, user, detalhes=detalhes)
    return JsonResponse({'id': p.id, 'message': 'Produto criado com sucesso.'}, status=201)


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
