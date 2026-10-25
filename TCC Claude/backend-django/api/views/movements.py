import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection

from api.permissions import can

TIPOS = {'entrada', 'saida', 'edicao', 'remocao'}
COLUNAS_ORDEM = {'created_at', 'product_nome', 'tipo', 'quantidade', 'user_nome', 'origem'}
DATA_ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')
FUSO = 'America/Sao_Paulo'
PAGE_SIZE_PADRAO = 20
PAGE_SIZE_MAX = 100


def _int_positivo(valor):
    try:
        n = int(valor)
        return n if n > 0 else None
    except (TypeError, ValueError):
        return None


@csrf_exempt
@require_http_methods(['GET'])
def list_movements(request):
    user = request.user_data
    page = _int_positivo(request.GET.get('page', 1)) or (None if 'page' in request.GET else 1)
    page_size_raw = request.GET.get('pageSize')
    page_size = _int_positivo(page_size_raw) if page_size_raw is not None else PAGE_SIZE_PADRAO

    if page is None or page_size is None:
        return JsonResponse({'message': 'Parâmetros de paginação inválidos.'}, status=400)

    limit = min(page_size, PAGE_SIZE_MAX)
    params = []

    def add(val):
        params.append(val)
        return '%s'

    where = []

    u = request.GET.get('user', '')
    if u.strip():
        where.append(f'user_nome = {add(u.strip())}')

    tipo = request.GET.get('tipo', '')
    if tipo:
        if tipo not in TIPOS:
            return JsonResponse({'message': 'Tipo de ação inválido.'}, status=400)
        where.append(f'tipo = {add(tipo)}')

    q = request.GET.get('q', '')
    if q.strip():
        trecho = re.sub(r'([\\%_])', r'\\\1', q.strip())
        where.append(f"product_nome ILIKE {add('%' + trecho + '%')}")

    frm = request.GET.get('from', '')
    to = request.GET.get('to', '')
    if frm:
        if not DATA_ISO.match(frm):
            return JsonResponse({'message': 'Data inicial inválida.'}, status=400)
        where.append(f"created_at >= ({add(frm)}::date)::timestamp AT TIME ZONE '{FUSO}'")
    if to:
        if not DATA_ISO.match(to):
            return JsonResponse({'message': 'Data final inválida.'}, status=400)
        where.append(f"created_at < (({add(to)}::date + 1)::timestamp AT TIME ZONE '{FUSO}')")
    if frm and to and frm > to:
        return JsonResponse({'message': 'A data final deve ser igual ou posterior à data inicial.'}, status=400)

    where.append(f'tenant_id = {add(user["tenant_id"])}')

    if not can(user['role'], 'movimentacao:ver-todas'):
        where.append(f'user_id = {add(user["id"])}')

    filtro = 'WHERE ' + ' AND '.join(where)

    coluna = request.GET.get('orderBy', 'created_at')
    if coluna not in COLUNAS_ORDEM:
        coluna = 'created_at'
    direcao = 'ASC' if request.GET.get('orderDir') == 'asc' else 'DESC'

    with connection.cursor() as cur:
        cur.execute(f'SELECT COUNT(*)::int AS total FROM movements {filtro}', params)
        total = cur.fetchone()[0]

        offset_val = (page - 1) * limit
        cur.execute(
            f"""SELECT id, product_id, product_nome, tipo, quantidade, user_id, user_nome,
                       origem, pedido_id, detalhes, created_at
                FROM movements {filtro}
                ORDER BY {coluna} {direcao}, id DESC
                LIMIT {add(limit)} OFFSET {add(offset_val)}""",
            params,
        )
        cols = [d[0] for d in cur.description]
        items = []
        for row in cur.fetchall():
            r = dict(zip(cols, row))
            for k, v in r.items():
                if hasattr(v, 'isoformat'):
                    r[k] = v.isoformat()
                elif hasattr(v, '__float__') and not isinstance(v, (int, float, bool)):
                    r[k] = float(v)
            items.append(r)

    return JsonResponse({'items': items, 'total': total, 'page': page, 'pageSize': limit})


@csrf_exempt
@require_http_methods(['GET'])
def list_movement_users(request):
    user = request.user_data
    with connection.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT user_nome FROM movements WHERE origem = 'estoque' AND tenant_id = %s",
            [user['tenant_id']],
        )
        nomes = sorted([r[0] for r in cur.fetchall() if r[0]])
    return JsonResponse(nomes, safe=False)
