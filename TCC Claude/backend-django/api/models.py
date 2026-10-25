from django.db import models


class Usuario(models.Model):
    id = models.BigAutoField(primary_key=True)
    nome = models.TextField()
    nome_empresa = models.TextField(blank=True, null=True)
    cpf_cnpj = models.TextField(blank=True, null=True)
    email = models.TextField(unique=True)
    senha_hash = models.TextField()
    role = models.TextField(default='admin')
    ativo = models.BooleanField(default=True)
    tenant_id = models.BigIntegerField(blank=True, null=True)
    email_recuperacao = models.TextField(blank=True, null=True)
    avatar_url = models.TextField(blank=True, null=True)
    reset_code_hash = models.TextField(blank=True, null=True)
    reset_code_expires_at = models.DateTimeField(blank=True, null=True)
    reset_code_tentativas = models.IntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'usuarios'


class Product(models.Model):
    id = models.BigAutoField(primary_key=True)
    nome = models.TextField()
    quantidade = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    unidade = models.TextField()
    peso_kg = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    categoria = models.TextField(blank=True, null=True)
    fornecedor = models.TextField(blank=True, null=True)
    codigo_barras = models.TextField(blank=True, null=True)
    tenant_id = models.BigIntegerField(blank=True, null=True)
    arquivado = models.BooleanField(default=False)
    arquivado_em = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'products'


class Movement(models.Model):
    id = models.BigAutoField(primary_key=True)
    product_id = models.BigIntegerField(blank=True, null=True)
    product_nome = models.TextField(blank=True, null=True)
    tipo = models.TextField()  # entrada, saida, edicao, remocao
    quantidade = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    user_id = models.BigIntegerField(blank=True, null=True)
    user_nome = models.TextField(blank=True, null=True)
    tenant_id = models.BigIntegerField(blank=True, null=True)
    origem = models.TextField(blank=True, null=True)
    pedido_id = models.BigIntegerField(blank=True, null=True)
    detalhes = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'movements'


class Notificacao(models.Model):
    id = models.BigAutoField(primary_key=True)
    usuario_id = models.BigIntegerField()
    tipo = models.TextField(blank=True, null=True)
    titulo = models.TextField(blank=True, null=True)
    texto = models.TextField(blank=True, null=True)
    acao = models.TextField(blank=True, null=True)
    lida = models.BooleanField(default=False)
    dispensada = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'notificacoes'
