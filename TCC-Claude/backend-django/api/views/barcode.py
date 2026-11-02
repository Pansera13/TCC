import re
import time
import os
import requests as _req
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection

from api.decorators import exige_permissao

VALID_LENGTHS = {8, 12, 13, 14}
TIMEOUT_S = 5
_cache = {}  # codigo → {'data': ..., 'ts': float}
CACHE_TTL = 24 * 3600


def _get_cache(codigo):
    entry = _cache.get(codigo)
    if entry is None:
        return None, False  # (data, found)
    if time.time() - entry['ts'] > CACHE_TTL:
        del _cache[codigo]
        return None, False
    return entry['data'], True


def _set_cache(codigo, data):
    _cache[codigo] = {'data': data, 'ts': time.time()}


def _query_cosmos(codigo):
    token = os.environ.get('COSMOS_TOKEN', '')
    if not token:
        return None, False
    try:
        r = _req.get(
            f'https://api.cosmos.bluesoft.com.br/gtins/{codigo}.json',
            headers={'X-Cosmos-Token': token, 'User-Agent': 'StockFlow/1.0'},
            timeout=TIMEOUT_S,
        )
        if r.status_code in (429, 401, 403) or r.status_code >= 500:
            return None, True  # temp fail
        if r.status_code in (404, 204) or not r.content:
            return None, False
        d = r.json()
        return {
            'codigo': codigo, 'nome': d.get('description'),
            'marca': (d.get('brand') or {}).get('name'),
            'categoria': None, 'ncm': None,
            'imagem': d.get('thumbnail') or d.get('picture'),
            'fonte': 'cosmos',
        }, False
    except Exception:
        return None, True


def _query_off(codigo):
    try:
        r = _req.get(
            f'https://world.openfoodfacts.org/api/v2/product/{codigo}.json',
            params={'fields': 'product_name,product_name_pt,brands,categories_tags,image_front_url'},
            timeout=TIMEOUT_S,
        )
        if r.status_code == 429 or r.status_code >= 500:
            return None, True
        if r.status_code == 404 or not r.content:
            return None, False
        d = r.json()
        if d.get('status') in (0, 'failure') or not d.get('product'):
            return None, False
        p = d['product']
        nome = (p.get('product_name_pt') or p.get('product_name') or '').strip()
        if not nome:
            return None, False
        cat_tags = p.get('categories_tags', [])
        cat_tag = next((t for t in cat_tags if t.startswith('pt:')), cat_tags[0] if cat_tags else None)
        categoria = re.sub(r'^[a-z]{2}:', '', cat_tag).replace('-', ' ') if cat_tag else None
        return {
            'codigo': codigo, 'nome': nome,
            'marca': p['brands'].split(',')[0].strip() if p.get('brands') else None,
            'categoria': categoria, 'ncm': None,
            'imagem': p.get('image_front_url'),
            'fonte': 'openfoodfacts',
        }, False
    except Exception:
        return None, True


def _lookup(codigo):
    cached, found = _get_cache(codigo)
    if found:
        return cached, None

    cosmos_result, cosmos_temp = _query_cosmos(codigo)
    if cosmos_result:
        _set_cache(codigo, cosmos_result)
        return cosmos_result, None

    off_result, off_temp = _query_off(codigo)
    if off_result:
        _set_cache(codigo, off_result)
        return off_result, None

    if cosmos_temp and off_temp:
        return None, 'Serviço de busca temporariamente indisponível. Tente novamente em alguns instantes.'
    if not cosmos_temp and not off_temp:
        _set_cache(codigo, None)
    return None, None


@csrf_exempt
@require_http_methods(['GET'])
@exige_permissao('produto:cadastrar')
def get_barcode_product(request, codigo):
    user = request.user_data

    if not re.match(r'^\d+$', codigo) or len(codigo) not in VALID_LENGTHS:
        return JsonResponse(
            {'message': 'Código inválido. Informe um EAN com 8, 12, 13 ou 14 dígitos numéricos.'},
            status=400,
        )

    ja_cadastrado = False
    produto_existente = None
    with connection.cursor() as cur:
        cur.execute(
            'SELECT id, nome FROM products WHERE codigo_barras = %s AND tenant_id = %s LIMIT 1',
            [codigo, user['tenant_id']],
        )
        row = cur.fetchone()
        if row:
            ja_cadastrado = True
            produto_existente = {'id': row[0], 'nome': row[1]}

    produto, erro = _lookup(codigo)
    if erro:
        return JsonResponse({'message': erro}, status=429)
    if produto is None:
        return JsonResponse({
            'message': 'Produto não encontrado nas bases de dados. Preencha os dados manualmente.',
            'jaCadastrado': ja_cadastrado,
            'produtoExistente': produto_existente,
        }, status=404)

    return JsonResponse({**produto, 'jaCadastrado': ja_cadastrado, 'produtoExistente': produto_existente})
