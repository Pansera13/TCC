"""Testa a matriz de permissões — espelho de backend/test/permissoes-rotas.test.js"""
import pytest
from api.permissions import (
    can, permissoes_do_cargo, pode_alterar_conta, pode_criar_cargo, cargo_valido
)


# ── can() ─────────────────────────────────────────────────────────────────────

class TestCan:
    def test_user_tem_estoque_ver(self):
        assert can('user', 'estoque:ver')

    def test_user_nao_tem_produto_cadastrar(self):
        assert not can('user', 'produto:cadastrar')

    def test_user_nao_tem_produto_excluir(self):
        assert not can('user', 'produto:excluir')

    def test_socio_tem_produto_cadastrar(self):
        assert can('socio', 'produto:cadastrar')

    def test_socio_nao_tem_produto_excluir(self):
        assert not can('socio', 'produto:excluir')

    def test_socio_herda_estoque_ver(self):
        assert can('socio', 'estoque:ver')

    def test_admin_tem_produto_excluir(self):
        assert can('admin', 'produto:excluir')

    def test_admin_herda_produto_cadastrar(self):
        assert can('admin', 'produto:cadastrar')

    def test_admin_herda_estoque_ver(self):
        assert can('admin', 'estoque:ver')

    def test_cargo_invalido_retorna_false(self):
        assert not can('superadmin', 'estoque:ver')

    def test_permissao_invalida_retorna_false(self):
        assert not can('admin', 'permissao:inexistente')

    def test_string_vazia_retorna_false(self):
        assert not can('', 'estoque:ver')


# ── permissoes_do_cargo() ──────────────────────────────────────────────────────

class TestPermissoesDoCargo:
    def test_user_tem_4_permissoes(self):
        perms = permissoes_do_cargo('user')
        assert len(perms) == 4
        assert 'estoque:ver' in perms
        assert 'produto:retirar' in perms

    def test_admin_tem_todas_as_permissoes(self):
        perms_admin = set(permissoes_do_cargo('admin'))
        perms_socio = set(permissoes_do_cargo('socio'))
        assert perms_socio.issubset(perms_admin)
        assert 'produto:excluir' in perms_admin

    def test_socio_contem_permissoes_user(self):
        perms_socio = set(permissoes_do_cargo('socio'))
        perms_user = set(permissoes_do_cargo('user'))
        assert perms_user.issubset(perms_socio)


# ── pode_alterar_conta() / pode_criar_cargo() ─────────────────────────────────

class TestPodeAlterarConta:
    def test_admin_pode_alterar_user(self):
        assert pode_alterar_conta('admin', 'user')

    def test_admin_pode_alterar_socio(self):
        assert pode_alterar_conta('admin', 'socio')

    def test_admin_pode_alterar_admin(self):
        assert pode_alterar_conta('admin', 'admin')

    def test_socio_pode_alterar_user(self):
        assert pode_alterar_conta('socio', 'user')

    def test_socio_nao_pode_alterar_socio(self):
        assert not pode_alterar_conta('socio', 'socio')

    def test_socio_nao_pode_alterar_admin(self):
        assert not pode_alterar_conta('socio', 'admin')

    def test_user_nao_pode_alterar_ninguem(self):
        assert not pode_alterar_conta('user', 'user')


class TestPodeCriarCargo:
    def test_admin_cria_qualquer_cargo(self):
        assert pode_criar_cargo('admin', 'user')
        assert pode_criar_cargo('admin', 'socio')
        assert pode_criar_cargo('admin', 'admin')

    def test_socio_so_cria_user(self):
        assert pode_criar_cargo('socio', 'user')
        assert not pode_criar_cargo('socio', 'socio')
        assert not pode_criar_cargo('socio', 'admin')

    def test_user_nao_cria_nada(self):
        assert not pode_criar_cargo('user', 'user')


class TestCargoValido:
    def test_cargos_validos(self):
        assert cargo_valido('user')
        assert cargo_valido('socio')
        assert cargo_valido('admin')

    def test_cargo_invalido(self):
        assert not cargo_valido('superadmin')
        assert not cargo_valido('')
