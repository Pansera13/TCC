import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.conf import settings

DATA_ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')
FUSO = 'America/Sao_Paulo'
MAX_DIAS = 366


def _data_valida(s):
    if not isinstance(s, str):
        return False
    if not DATA_ISO.match(s):
        return False
    try:
        from datetime import date
        date.fromisoformat(s)
        return True
    except ValueError:
        return False


@csrf_exempt
@require_http_methods(['GET'])
def get_report(request):
    user = request.user_data
    frm = request.GET.get('from', '')
    to = request.GET.get('to', '')

    if not _data_valida(frm) or not _data_valida(to):
        return JsonResponse({'message': 'Informe as datas inicial e final no formato AAAA-MM-DD.'}, status=400)
    if frm > to:
        return JsonResponse({'message': 'A data final deve ser igual ou posterior à data inicial.'}, status=400)

    from datetime import date
    delta = (date.fromisoformat(to) - date.fromisoformat(frm)).days + 1
    if delta > MAX_DIAS:
        return JsonResponse({'message': f'O período máximo é de {MAX_DIAS} dias.'}, status=400)

    tenant_id = user['tenant_id']
    threshold = getattr(settings, 'LOW_STOCK_THRESHOLD', 3)

    # psycopg2 uses %s positional placeholders — tenant_id comes first, then frm, to
    periodo = (
        f"m.created_at >= (%s::date)::timestamp AT TIME ZONE '{FUSO}' "
        f"AND m.created_at < ((%s::date + 1)::timestamp AT TIME ZONE '{FUSO}')"
    )
    nao_arquivado = "NOT EXISTS (SELECT 1 FROM products _p WHERE _p.id = m.product_id AND _p.arquivado = true)"

    with connection.cursor() as cur:
        cur.execute(
            f"""SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE quantidade > 0 AND quantidade <= %s)::int AS baixo,
                       COUNT(*) FILTER (WHERE quantidade = 0)::int AS esgotados
                FROM products WHERE tenant_id = %s AND arquivado = false""",
            [threshold, tenant_id],
        )
        estoque = cur.fetchone()

        cur.execute(
            f"""SELECT COALESCE(SUM(m.quantidade) FILTER (WHERE m.tipo = 'entrada'), 0) AS entradas,
                       COALESCE(SUM(m.quantidade) FILTER (WHERE m.tipo = 'saida'), 0) AS saidas
                FROM movements m WHERE m.tipo IN ('entrada','saida') AND m.tenant_id = %s AND {periodo}
                  AND {nao_arquivado}""",
            [tenant_id, frm, to],
        )
        totais = cur.fetchone()

        cur.execute(
            f"""SELECT m.product_id, MAX(m.product_nome) AS nome, SUM(m.quantidade)::float AS quantidade
                FROM movements m WHERE m.tipo = 'saida' AND m.tenant_id = %s AND {periodo}
                  AND {nao_arquivado}
                GROUP BY m.product_id ORDER BY SUM(m.quantidade) DESC, MAX(m.product_nome) LIMIT 10""",
            [tenant_id, frm, to],
        )
        top = cur.fetchall()

        cur.execute(
            f"""SELECT p.id AS product_id, p.nome, p.categoria, p.unidade, p.quantidade::float AS estoque,
                       COALESCE(s.retirado, 0)::float AS retirado
                FROM products p
                LEFT JOIN (
                  SELECT m.product_id, SUM(m.quantidade) AS retirado
                  FROM movements m WHERE m.tipo = 'saida' AND m.tenant_id = %s AND {periodo} GROUP BY m.product_id
                ) s ON s.product_id = p.id
                WHERE p.tenant_id = %s AND p.arquivado = false
                ORDER BY COALESCE(s.retirado, 0) DESC, p.nome""",
            [tenant_id, frm, to, tenant_id],
        )
        giro_rows = cur.fetchall()

        cur.execute(
            f"""SELECT COALESCE(NULLIF(TRIM(p.categoria), ''), 'Sem Categoria') AS categoria,
                       SUM(m.quantidade)::float AS quantidade
                FROM movements m JOIN products p ON p.id = m.product_id
                WHERE m.tipo = 'saida' AND m.tenant_id = %s AND {periodo} AND p.arquivado = false
                GROUP BY 1 ORDER BY SUM(m.quantidade) DESC, 1""",
            [tenant_id, frm, to],
        )
        consumo = cur.fetchall()

    return JsonResponse({
        'period': {'from': frm, 'to': to},
        'summary': {
            'totalProdutos': estoque[0],
            'estoqueBaixo': estoque[1],
            'esgotados': estoque[2],
            'totalEntradas': float(totais[0]),
            'totalSaidas': float(totais[1]),
        },
        'topRetirados': [{'product_id': r[0], 'nome': r[1], 'quantidade': float(r[2])} for r in top],
        'giro': [
            {
                'product_id': r[0], 'nome': r[1],
                'categoria': r[2] or 'Sem Categoria', 'unidade': r[3],
                'estoque': float(r[4]), 'retirado': float(r[5]),
                'giro': float(r[5]) / float(r[4]) if float(r[4]) > 0 else None,
            }
            for r in giro_rows
        ],
        'consumoPorCategoria': [{'categoria': r[0], 'quantidade': float(r[1])} for r in consumo],
    })
