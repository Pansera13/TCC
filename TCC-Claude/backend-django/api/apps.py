import os
from django.apps import AppConfig
from django.core.checks import Error, register


def check_producao_configs(app_configs, **kwargs):
    """
    Verifica variáveis de ambiente obrigatórias quando DJANGO_ENV=production.
    Erros de sistema impedem o servidor de subir.
    """
    errors = []
    if os.environ.get('DJANGO_ENV') != 'production':
        return errors
    if not os.environ.get('ALLOWED_HOSTS', '').strip():
        errors.append(Error(
            'DJANGO_ENV=production requer ALLOWED_HOSTS definido explicitamente.',
            hint='Defina ALLOWED_HOSTS=seu.dominio.com no ambiente de produção.',
            id='stockflow.E001',
        ))
    if not os.environ.get('ALLOWED_ORIGINS', '').strip():
        errors.append(Error(
            'DJANGO_ENV=production requer ALLOWED_ORIGINS definido explicitamente.',
            hint='Defina ALLOWED_ORIGINS=https://seu.dominio.com no ambiente de produção.',
            id='stockflow.E002',
        ))
    return errors


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        register(check_producao_configs)
