# Configuração do HSM DINAMO

## Pré-requisitos

- HSM DINAMO instalado e configurado
- Acesso de administrador ao HSM
- Cliente DINAMO instalado na máquina

## Configuração Inicial

### 1. Conectar ao HSM

```bash
# Via interface web (se disponível)
https://[HSM_IP]:9443

# Ou via cliente DINAMO
dinamo-cli connect -h [HSM_IP] -u admin -p [ADMIN_PASSWORD]
```

### 2. Criar Usuário Administrativo para a Aplicação

```bash
# Criar usuário com permissões necessárias
dinamo-cli user create \
  --name "stellar_admin" \
  --password "senha_segura" \
  --permissions "LIST,READ,CREATE,DELETE,UPDATE"
```

### 3. Configurar Permissões

As permissões mínimas necessárias são:
- `LIST`: Listar objetos
- `READ`: Ler chaves públicas
- `CREATE`: Criar chaves
- `DELETE`: Deletar objetos (opcional)
- `UPDATE`: Atualizar objetos (opcional)

## Estrutura de Partições

### Recomendação de Organização

```
HSM
├── Partição: production
│   ├── stellar_signing_key_1
│   ├── stellar_signing_key_2
│   └── stellar_signing_key_3
├── Partição: staging
│   └── stellar_test_key_1
└── Partição: development
    └── stellar_dev_key_1
```

## Operações Específicas para Stellar

### Algoritmo ED25519

O Stellar usa exclusivamente ED25519. Configure o HSM para:

1. **Modo Pure ED25519** (não PH - Pre-Hash)
2. **Tamanho da chave**: 256 bits
3. **Formato de assinatura**: 64 bytes

### Exemplo de Configuração

```javascript
// Configuração para o SDK DINAMO
const keyConfig = {
  algorithm: hsm.enums.ECX_ASYMMETRIC_SWITCHES.ALG_EC_ED25519,
  exportable: false,     // Chave não pode ser exportada
  temporary: false,      // Chave persistente
  label: "stellar_key_001"
};
```

## Segurança

### Boas Práticas

1. **Segregação de Ambientes**
   - Use partições separadas para prod/staging/dev
   - Diferentes credenciais por ambiente

2. **Rotação de Chaves**
   - Implemente política de rotação
   - Mantenha histórico de chaves antigas

3. **Backup e Recuperação**
   - Configure backup automático do HSM
   - Teste procedimentos de recuperação

4. **Auditoria**
   - Ative logs detalhados
   - Monitore operações sensíveis

### Hardening

```bash
# Desabilitar protocolos inseguros
dinamo-cli config set --tls-min-version 1.2

# Configurar timeout de sessão
dinamo-cli config set --session-timeout 300

# Limitar tentativas de login
dinamo-cli config set --max-login-attempts 3
```

## Monitoramento

### Métricas Importantes

- **Uso de CPU/Memória do HSM**
- **Número de operações por segundo**
- **Latência de assinatura**
- **Erros de autenticação**

### Alertas Recomendados

1. Falha de autenticação repetida
2. Uso de recursos > 80%
3. Operações de delete em produção
4. Criação de chaves fora do horário

## Troubleshooting

### Problema: "Timeout ao conectar"
```bash
# Verificar conectividade
ping [HSM_IP]
telnet [HSM_IP] 9000

# Verificar firewall
sudo iptables -L
```

### Problema: "Permissão negada"
```bash
# Verificar permissões do usuário
dinamo-cli user info --name [USERNAME]

# Adicionar permissão faltante
dinamo-cli user update --name [USERNAME] --add-perm [PERMISSION]
```

### Problema: "Assinatura inválida"
- Confirme algoritmo ED25519 (não ED25519PH)
- Verifique tamanho do hash (32 bytes)
- Confirme formato da assinatura (64 bytes)

## Performance

### Otimizações

1. **Pool de Conexões**
   ```javascript
   const poolConfig = {
     min: 2,
     max: 10,
     idleTimeout: 30000
   };
   ```

2. **Cache de Sessão**
   - Reutilize sessões autenticadas
   - Implemente renovação automática

3. **Batch Operations**
   - Agrupe operações quando possível
   - Use transações para múltiplas assinaturas

## Integração com CI/CD

### Variáveis de Ambiente

```yaml
# .gitlab-ci.yml ou similar
variables:
  HSM_HOST: $CI_HSM_HOST
  HSM_USER: $CI_HSM_USER
  HSM_PASS: $CI_HSM_PASS
```

### Testes Automatizados

```javascript
// test/hsm.integration.spec.js
describe('HSM Integration', () => {
  it('should connect to HSM', async () => {
    const connected = await hsm.testConnection();
    expect(connected).toBe(true);
  });
  
  it('should create and sign with key', async () => {
    const keyId = await hsm.createTestKey();
    const signature = await hsm.sign(keyId, testData);
    expect(signature).toHaveLength(64);
  });
});
```

## Referências

- [Manual DINAMO HSM](https://docs.dinamonetworks.com)
- [Stellar SEP-0005](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md)
- [ED25519 RFC](https://tools.ietf.org/html/rfc8032)
