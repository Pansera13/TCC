"""
Testes do system check de configuração de produção (api/apps.py).

Verifica que DJANGO_ENV=production exige ALLOWED_HOSTS e ALLOWED_ORIGINS
e que fora de produção nenhum erro é gerado.
"""
import pytest
from api.apps import check_producao_configs


class TestCheckProducaoConfigs:

    def test_producao_sem_allowed_hosts_retorna_erro(self, monkeypatch):
        monkeypatch.setenv('DJANGO_ENV', 'production')
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://app.example.com')
        monkeypatch.delenv('ALLOWED_HOSTS', raising=False)
        errors = check_producao_configs(None)
        ids = [e.id for e in errors]
        assert 'stockflow.E001' in ids
        assert 'stockflow.E002' not in ids

    def test_producao_sem_allowed_origins_retorna_erro(self, monkeypatch):
        monkeypatch.setenv('DJANGO_ENV', 'production')
        monkeypatch.setenv('ALLOWED_HOSTS', 'api.example.com')
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        errors = check_producao_configs(None)
        ids = [e.id for e in errors]
        assert 'stockflow.E002' in ids
        assert 'stockflow.E001' not in ids

    def test_producao_sem_ambos_retorna_dois_erros(self, monkeypatch):
        monkeypatch.setenv('DJANGO_ENV', 'production')
        monkeypatch.delenv('ALLOWED_HOSTS', raising=False)
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        errors = check_producao_configs(None)
        ids = [e.id for e in errors]
        assert 'stockflow.E001' in ids
        assert 'stockflow.E002' in ids

    def test_producao_com_tudo_definido_sem_erros(self, monkeypatch):
        monkeypatch.setenv('DJANGO_ENV', 'production')
        monkeypatch.setenv('ALLOWED_HOSTS', 'api.example.com')
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://app.example.com')
        errors = check_producao_configs(None)
        assert errors == []

    def test_fora_de_producao_sem_erros(self, monkeypatch):
        monkeypatch.delenv('DJANGO_ENV', raising=False)
        monkeypatch.delenv('ALLOWED_HOSTS', raising=False)
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        errors = check_producao_configs(None)
        assert errors == []

    def test_desenvolvimento_explicito_sem_erros(self, monkeypatch):
        monkeypatch.setenv('DJANGO_ENV', 'development')
        monkeypatch.delenv('ALLOWED_HOSTS', raising=False)
        monkeypatch.delenv('ALLOWED_ORIGINS', raising=False)
        errors = check_producao_configs(None)
        assert errors == []

    def test_allowed_hosts_so_espacos_e_considerado_vazio(self, monkeypatch):
        """String com apenas espaços deve contar como não definida."""
        monkeypatch.setenv('DJANGO_ENV', 'production')
        monkeypatch.setenv('ALLOWED_HOSTS', '   ')
        monkeypatch.setenv('ALLOWED_ORIGINS', 'https://app.example.com')
        errors = check_producao_configs(None)
        ids = [e.id for e in errors]
        assert 'stockflow.E001' in ids
