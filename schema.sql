-- Cadernex — estrutura do banco (schema public) exportada do Supabase em 15/10/2026.
-- Só a estrutura: nenhuma linha de dados de usuário. Segredos ficam no Vault e em push_cfg (não aqui).
-- Serve de backup e histórico. Para recriar o banco do zero, rodar na ordem das seções.
-- Não inclui: permissões de execução das funções (grant execute), schemas auth/storage e extensões.


-- ============================================================
-- 1. Tabelas
-- ============================================================

create table if not exists public.agenda (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  tipo text not null,
  titulo text not null,
  dias integer[] not null,
  inicio text not null,
  fim text not null,
  local text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.backups (
  id bigint default nextval('backups_id_seq'::regclass) not null,
  criado timestamp with time zone default now() not null,
  tamanho integer,
  dados jsonb not null
);

create table if not exists public.cofre (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  data date not null,
  valor numeric(10,2) not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.corrida_codigos (
  corrida_id uuid not null,
  coleta text not null,
  entrega text not null,
  erros integer default 0 not null,
  bloq_ate timestamp with time zone
);

create table if not exists public.corrida_msgs (
  id uuid default gen_random_uuid() not null,
  corrida_id uuid not null,
  user_id uuid default auth.uid() not null,
  texto text not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.corrida_pos (
  corrida_id uuid not null,
  entregador_id uuid default auth.uid() not null,
  lat double precision not null,
  lng double precision not null,
  precisao integer,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.corridas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid default auth.uid() not null,
  cliente_nome text,
  entregador_id uuid,
  entregador_nome text,
  status text default 'aberta'::text not null,
  coleta_bairro text not null,
  entrega_bairro text not null,
  item text not null,
  valor numeric(10,2) not null,
  veiculo text default 'qualquer'::text not null,
  distancia_km numeric(6,1),
  nota integer,
  created_at timestamp with time zone default now() not null,
  aceita_em timestamp with time zone,
  coletada_em timestamp with time zone,
  entregue_em timestamp with time zone,
  tipo text default 'entrega'::text not null,
  agendado_para timestamp with time zone,
  ajudantes integer default 0 not null,
  andares integer default 0 not null,
  ent_veiculo text,
  ent_placa text,
  loja boolean default false not null,
  alerta_em timestamp with time zone,
  alertas integer default 0 not null,
  parado_avisado boolean default false not null,
  ausente_em timestamp with time zone,
  retorno_em timestamp with time zone,
  retorno_valor numeric(10,2),
  devolvida_em timestamp with time zone
);

create table if not exists public.corridas_det (
  corrida_id uuid not null,
  coleta_end text not null,
  entrega_end text not null,
  coleta_lat double precision,
  coleta_lng double precision,
  entrega_lat double precision,
  entrega_lng double precision,
  contato text,
  obs text
);

create table if not exists public.dados_pessoais (
  user_id uuid default auth.uid() not null,
  nome_completo text not null,
  celular text not null,
  nascimento date,
  cpf text,
  nacionalidade text not null,
  aceite_em timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  pix_ativo boolean default false not null,
  saque_pix boolean default false not null,
  cnpj text,
  empresa_nome text
);

create table if not exists public.denuncias (
  msg_id uuid not null,
  user_id uuid default auth.uid() not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.despesas (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  data date not null,
  categoria text not null,
  valor numeric(10,2) not null,
  nota text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.disponiveis (
  user_id uuid default auth.uid() not null,
  nome text,
  veiculo text not null,
  regiao text,
  atualizado_em timestamp with time zone default now() not null,
  lat double precision,
  lng double precision,
  pos_em timestamp with time zone
);

create table if not exists public.encomendas (
  id uuid default gen_random_uuid() not null,
  loja_id uuid not null,
  cliente_id uuid default auth.uid() not null,
  cliente_nome text,
  itens jsonb not null,
  subtotal numeric(10,2) not null,
  taxa numeric(10,2),
  km numeric(6,1),
  entrega_end text not null,
  entrega_bairro text not null,
  entrega_lat double precision,
  entrega_lng double precision,
  contato text,
  obs text,
  status text default 'nova'::text not null,
  motivo text,
  corrida_id uuid,
  total numeric(10,2),
  taxa_app numeric(10,2),
  preference_id text,
  payment_id text,
  pago_em timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.erros_app (
  id bigint generated always as identity not null,
  user_id uuid default auth.uid(),
  msg text not null,
  onde text,
  tela text,
  versao text,
  aparelho text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.gastos_fac (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  data date not null,
  categoria text not null,
  valor numeric(10,2) not null,
  nota text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.infracoes (
  id uuid default gen_random_uuid() not null,
  corrida_id uuid not null,
  autor_id uuid default auth.uid() not null,
  alvo_id uuid not null,
  motivo text not null,
  detalhe text,
  arquivada boolean default false not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.mensagens (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  sala text not null,
  texto text not null,
  nome text,
  apoiador boolean default false not null,
  oculta boolean default false not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.mp_contas (
  user_id uuid not null,
  mp_user_id text,
  access_token text not null,
  refresh_token text,
  expira_em timestamp with time zone,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.pagamentos (
  corrida_id uuid not null,
  cliente_id uuid not null,
  entregador_id uuid not null,
  valor numeric(10,2) not null,
  taxa_app numeric(10,2) not null,
  total numeric(10,2) not null,
  preference_id text,
  payment_id text,
  status text default 'pendente'::text not null,
  criado_em timestamp with time zone default now() not null,
  pago_em timestamp with time zone,
  comissao numeric(10,2) default 0 not null
);

create table if not exists public.perfis (
  user_id uuid default auth.uid() not null,
  nome text,
  meta numeric(10,2) default 0 not null,
  turno_inicio timestamp with time zone,
  updated_at timestamp with time zone default now() not null,
  deslocamento integer default 30 not null,
  curso text,
  faculdade text,
  periodo text,
  semestre integer,
  licoes integer[] default '{}'::integer[] not null,
  apoiador boolean default false not null,
  admin boolean default false not null,
  tipo text default 'entregador'::text not null,
  telefone text,
  end_padrao text,
  bloqueado boolean default false not null,
  defesa text,
  aprovado boolean default true not null,
  loja boolean default false not null,
  loja_nome text,
  loja_end text,
  loja_bairro text,
  loja_cnpj text,
  loja_horario text,
  loja_whats text,
  loja_cep text,
  loja_lat double precision,
  loja_lng double precision,
  loja_ramo text,
  loja_insta text,
  loja_face text,
  loja_site text,
  promotor boolean default false not null,
  promotor_codigo text,
  promotor_pix text,
  promotor_desde timestamp with time zone,
  indicado_por uuid,
  indicado_em timestamp with time zone,
  loja_cidade text,
  loja_uf text,
  loja_responsavel text,
  loja_email text,
  promotor_nome text,
  promotor_cpf text,
  promotor_nasc date,
  promotor_whats text,
  promotor_cidade text,
  promotor_uf text,
  promotor_termos_em timestamp with time zone,
  promotor_termos_versao text
);

create table if not exists public.produtos (
  id uuid default gen_random_uuid() not null,
  loja_id uuid default auth.uid() not null,
  nome text not null,
  preco numeric(10,2) not null,
  descricao text,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.promotor_lojas (
  id bigint generated always as identity not null,
  promotor_id uuid not null,
  convite text not null,
  status text default 'pendente'::text not null,
  nome text not null,
  ramo text,
  responsavel text not null,
  whats text not null,
  telefone text,
  email text,
  cnpj text,
  cep text not null,
  rua text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  uf text not null,
  lat double precision,
  lng double precision,
  geo_origem text,
  horario text,
  obs text,
  loja_id uuid,
  criado_em timestamp with time zone default now() not null,
  ativada_em timestamp with time zone
);

create table if not exists public.promotor_saques (
  id bigint generated always as identity not null,
  promotor_id uuid not null,
  valor numeric(10,2) not null,
  pix text not null,
  status text default 'pedido'::text not null,
  obs text,
  pedido_em timestamp with time zone default now() not null,
  pago_em timestamp with time zone,
  feito_por uuid
);

create table if not exists public.push_cfg (
  id integer default 1 not null,
  pub text,
  priv jsonb,
  segredo text default replace(((gen_random_uuid())::text || (gen_random_uuid())::text), '-'::text, ''::text) not null
);

create table if not exists public.push_msgs (
  endpoint text not null,
  titulo text,
  corpo text,
  url text,
  tag text,
  criado timestamp with time zone default now() not null
);

create table if not exists public.push_subs (
  endpoint text not null,
  user_id uuid not null,
  criado timestamp with time zone default now() not null
);

create table if not exists public.tarefas (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  tipo text not null,
  materia text,
  titulo text not null,
  data date not null,
  feito boolean default false not null,
  nota numeric(4,1),
  created_at timestamp with time zone default now() not null
);

create table if not exists public.turnos (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  data date not null,
  inicio text,
  fim text,
  minutos integer default 0 not null,
  app text,
  ganho numeric(10,2) default 0 not null,
  gorjeta numeric(10,2) default 0 not null,
  km numeric(10,1) default 0 not null,
  entregas integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.veiculos (
  user_id uuid default auth.uid() not null,
  tipo text not null,
  placa text not null,
  cnh text,
  rntrc text,
  atualizado_em timestamp with time zone default now() not null
);


-- ============================================================
-- 2. Chaves e restrições
-- ============================================================

alter table public.agenda add constraint agenda_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.agenda add constraint agenda_tipo_check CHECK ((tipo = ANY (ARRAY['aula'::text, 'trabalho'::text, 'outro'::text])));
alter table public.agenda add constraint agenda_pkey PRIMARY KEY (id);
alter table public.backups add constraint backups_pkey PRIMARY KEY (id);
alter table public.cofre add constraint cofre_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.cofre add constraint cofre_pkey PRIMARY KEY (id);
alter table public.corrida_codigos add constraint corrida_codigos_pkey PRIMARY KEY (corrida_id);
alter table public.corrida_codigos add constraint corrida_codigos_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE;
alter table public.corrida_msgs add constraint corrida_msgs_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE;
alter table public.corrida_msgs add constraint corrida_msgs_pkey PRIMARY KEY (id);
alter table public.corrida_msgs add constraint corrida_msgs_texto_check CHECK (((char_length(texto) >= 1) AND (char_length(texto) <= 500)));
alter table public.corrida_msgs add constraint corrida_msgs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.corrida_pos add constraint corrida_pos_entregador_id_fkey FOREIGN KEY (entregador_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.corrida_pos add constraint corrida_pos_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE;
alter table public.corrida_pos add constraint corrida_pos_pkey PRIMARY KEY (corrida_id);
alter table public.corrida_pos add constraint corrida_pos_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision)));
alter table public.corrida_pos add constraint corrida_pos_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision)));
alter table public.corridas add constraint corridas_item_check CHECK (((char_length(item) >= 2) AND (char_length(item) <= 120)));
alter table public.corridas add constraint corridas_entregador_id_fkey FOREIGN KEY (entregador_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.corridas add constraint corridas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.corridas add constraint corridas_veiculo_ck CHECK ((veiculo = ANY (ARRAY['qualquer'::text, 'bike'::text, 'moto'::text, 'carroceria'::text, 'picape_p'::text, 'picape_m'::text, 'caminhao'::text])));
alter table public.corridas add constraint corridas_valor_teto CHECK (((valor > (0)::numeric) AND (valor < (20000)::numeric)));
alter table public.corridas add constraint corridas_valor_minimo CHECK ((valor >= (8)::numeric)) NOT VALID;
alter table public.corridas add constraint corridas_tipo_ck CHECK (((tipo = ANY (ARRAY['entrega'::text, 'frete'::text])) AND ((ajudantes >= 0) AND (ajudantes <= 2)) AND ((andares >= 0) AND (andares <= 40))));
alter table public.corridas add constraint corridas_status_check CHECK ((status = ANY (ARRAY['aberta'::text, 'aceita'::text, 'coletada'::text, 'entregue'::text, 'cancelada'::text])));
alter table public.corridas add constraint corridas_pkey PRIMARY KEY (id);
alter table public.corridas add constraint corridas_nota_check CHECK (((nota >= 1) AND (nota <= 5)));
alter table public.corridas_det add constraint corridas_det_pkey PRIMARY KEY (corrida_id);
alter table public.corridas_det add constraint corridas_det_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE;
alter table public.dados_pessoais add constraint dados_pessoais_cpf_check CHECK ((cpf ~ '^[0-9]{11}$'::text));
alter table public.dados_pessoais add constraint dados_cnpj_ck CHECK (((cnpj IS NULL) OR (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$'::text)));
alter table public.dados_pessoais add constraint dados_doc_ck CHECK ((((cpf IS NOT NULL) AND (nascimento IS NOT NULL)) OR ((cnpj IS NOT NULL) AND (char_length(COALESCE(empresa_nome, ''::text)) >= 2))));
alter table public.dados_pessoais add constraint dados_pessoais_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.dados_pessoais add constraint dados_pessoais_pkey PRIMARY KEY (user_id);
alter table public.dados_pessoais add constraint dados_pessoais_nome_completo_check CHECK (((char_length(nome_completo) >= 5) AND (char_length(nome_completo) <= 120)));
alter table public.dados_pessoais add constraint dados_pessoais_celular_check CHECK ((celular ~ '^[0-9]{10,11}$'::text));
alter table public.denuncias add constraint denuncias_pkey PRIMARY KEY (msg_id, user_id);
alter table public.denuncias add constraint denuncias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.denuncias add constraint denuncias_msg_id_fkey FOREIGN KEY (msg_id) REFERENCES mensagens(id) ON DELETE CASCADE;
alter table public.despesas add constraint despesas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.despesas add constraint despesas_pkey PRIMARY KEY (id);
alter table public.disponiveis add constraint disponiveis_veiculo_ck CHECK ((veiculo = ANY (ARRAY['bike'::text, 'moto'::text, 'picape_p'::text, 'picape_m'::text, 'caminhao'::text])));
alter table public.disponiveis add constraint disponiveis_pkey PRIMARY KEY (user_id);
alter table public.disponiveis add constraint disponiveis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.encomendas add constraint encomendas_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.encomendas add constraint encomendas_pkey PRIMARY KEY (id);
alter table public.encomendas add constraint encomendas_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE SET NULL;
alter table public.encomendas add constraint encomendas_status_check CHECK ((status = ANY (ARRAY['nova'::text, 'aceita'::text, 'paga'::text, 'enviada'::text, 'recusada'::text, 'cancelada'::text, 'devolvida'::text])));
alter table public.encomendas add constraint encomendas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.erros_app add constraint erros_app_pkey PRIMARY KEY (id);
alter table public.erros_app add constraint erros_app_aparelho_check CHECK ((char_length(aparelho) <= 200));
alter table public.erros_app add constraint erros_app_versao_check CHECK ((char_length(versao) <= 20));
alter table public.erros_app add constraint erros_app_tela_check CHECK ((char_length(tela) <= 40));
alter table public.erros_app add constraint erros_app_msg_check CHECK ((char_length(msg) <= 500));
alter table public.erros_app add constraint erros_app_onde_check CHECK ((char_length(onde) <= 300));
alter table public.gastos_fac add constraint gastos_fac_pkey PRIMARY KEY (id);
alter table public.gastos_fac add constraint gastos_fac_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.infracoes add constraint infracoes_motivo_check CHECK ((motivo = ANY (ARRAY['nao_entregou'::text, 'atraso'::text, 'avaria'::text, 'cobranca'::text, 'conduta'::text, 'nao_pagou'::text, 'endereco'::text, 'item_proibido'::text])));
alter table public.infracoes add constraint infracoes_corrida_id_autor_id_key UNIQUE (corrida_id, autor_id);
alter table public.infracoes add constraint infracoes_detalhe_check CHECK ((char_length(detalhe) <= 300));
alter table public.infracoes add constraint infracoes_alvo_id_fkey FOREIGN KEY (alvo_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.infracoes add constraint infracoes_pkey PRIMARY KEY (id);
alter table public.infracoes add constraint infracoes_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.infracoes add constraint infracoes_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE;
alter table public.mensagens add constraint mensagens_texto_check CHECK (((char_length(texto) >= 1) AND (char_length(texto) <= 500)));
alter table public.mensagens add constraint mensagens_pkey PRIMARY KEY (id);
alter table public.mensagens add constraint mensagens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.mensagens add constraint mensagens_sala_check CHECK ((sala = ANY (ARRAY['geral'::text, 'dicas'::text, 'faculdade'::text])));
alter table public.mp_contas add constraint mp_contas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.mp_contas add constraint mp_contas_pkey PRIMARY KEY (user_id);
alter table public.pagamentos add constraint pagamentos_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text, 'recusado'::text])));
alter table public.pagamentos add constraint pagamentos_corrida_id_fkey FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE;
alter table public.pagamentos add constraint pagamentos_pkey PRIMARY KEY (corrida_id);
alter table public.perfis add constraint perfis_tipo_ck CHECK ((tipo = ANY (ARRAY['entregador'::text, 'cliente'::text])));
alter table public.perfis add constraint perfis_indicado_por_fkey FOREIGN KEY (indicado_por) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.perfis add constraint perfis_loja_cnpj_ck CHECK (((loja_cnpj IS NULL) OR (loja_cnpj ~ '^[0-9]{14}$'::text)));
alter table public.perfis add constraint perfis_loja_ramo_ck CHECK (((loja_ramo IS NULL) OR (char_length(loja_ramo) <= 30)));
alter table public.perfis add constraint perfis_loja_redes_ck CHECK (((char_length(COALESCE(loja_insta, ''::text)) <= 60) AND (char_length(COALESCE(loja_face, ''::text)) <= 120) AND (char_length(COALESCE(loja_site, ''::text)) <= 120)));
alter table public.perfis add constraint perfis_pkey PRIMARY KEY (user_id);
alter table public.perfis add constraint perfis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.produtos add constraint produtos_pkey PRIMARY KEY (id);
alter table public.produtos add constraint produtos_nome_check CHECK (((char_length(nome) >= 2) AND (char_length(nome) <= 60)));
alter table public.produtos add constraint produtos_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.produtos add constraint produtos_descricao_check CHECK (((descricao IS NULL) OR (char_length(descricao) <= 140)));
alter table public.produtos add constraint produtos_preco_check CHECK (((preco >= (0)::numeric) AND (preco < (100000)::numeric)));
alter table public.promotor_lojas add constraint promotor_lojas_convite_key UNIQUE (convite);
alter table public.promotor_lojas add constraint promotor_lojas_promotor_id_fkey FOREIGN KEY (promotor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.promotor_lojas add constraint promotor_lojas_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'ativa'::text])));
alter table public.promotor_lojas add constraint promotor_lojas_geo_origem_check CHECK ((geo_origem = ANY (ARRAY['gps'::text, 'endereco'::text])));
alter table public.promotor_lojas add constraint promotor_lojas_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.promotor_lojas add constraint promotor_lojas_pkey PRIMARY KEY (id);
alter table public.promotor_saques add constraint promotor_saques_promotor_id_fkey FOREIGN KEY (promotor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.promotor_saques add constraint promotor_saques_feito_por_fkey FOREIGN KEY (feito_por) REFERENCES auth.users(id);
alter table public.promotor_saques add constraint promotor_saques_valor_check CHECK ((valor > (0)::numeric));
alter table public.promotor_saques add constraint promotor_saques_status_check CHECK ((status = ANY (ARRAY['pedido'::text, 'pago'::text, 'recusado'::text])));
alter table public.promotor_saques add constraint promotor_saques_pkey PRIMARY KEY (id);
alter table public.push_cfg add constraint push_cfg_pkey PRIMARY KEY (id);
alter table public.push_cfg add constraint push_cfg_id_check CHECK ((id = 1));
alter table public.push_msgs add constraint push_msgs_pkey PRIMARY KEY (endpoint);
alter table public.push_subs add constraint push_subs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.push_subs add constraint push_subs_pkey PRIMARY KEY (endpoint);
alter table public.tarefas add constraint tarefas_tipo_check CHECK ((tipo = ANY (ARRAY['prova'::text, 'trabalho'::text, 'leitura'::text])));
alter table public.tarefas add constraint tarefas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.tarefas add constraint tarefas_pkey PRIMARY KEY (id);
alter table public.turnos add constraint turnos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.turnos add constraint turnos_pkey PRIMARY KEY (id);
alter table public.veiculos add constraint veiculos_placa_check CHECK ((placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'::text));
alter table public.veiculos add constraint veiculos_cnh_check CHECK ((cnh = ANY (ARRAY['B'::text, 'C'::text, 'D'::text, 'E'::text])));
alter table public.veiculos add constraint veiculos_pkey PRIMARY KEY (user_id, tipo);
alter table public.veiculos add constraint veiculos_rntrc_check CHECK (((rntrc IS NULL) OR (rntrc ~ '^[0-9]{6,12}$'::text)));
alter table public.veiculos add constraint veiculos_tipo_check CHECK ((tipo = ANY (ARRAY['picape_p'::text, 'picape_m'::text, 'caminhao'::text])));
alter table public.veiculos add constraint veiculos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 3. Índices
-- ============================================================

CREATE INDEX agenda_user ON public.agenda USING btree (user_id);
CREATE INDEX cofre_user ON public.cofre USING btree (user_id, data DESC);
CREATE INDEX corrida_msgs_c ON public.corrida_msgs USING btree (corrida_id, created_at);
CREATE INDEX corridas_status ON public.corridas USING btree (status, created_at DESC);
CREATE UNIQUE INDEX dados_cnpj_unico ON public.dados_pessoais USING btree (cnpj);
CREATE UNIQUE INDEX dados_cpf_unico ON public.dados_pessoais USING btree (cpf);
CREATE INDEX despesas_user_data ON public.despesas USING btree (user_id, data DESC);
CREATE INDEX erros_app_data ON public.erros_app USING btree (created_at DESC);
CREATE INDEX gastos_fac_user ON public.gastos_fac USING btree (user_id, data DESC);
CREATE INDEX mensagens_sala ON public.mensagens USING btree (sala, created_at DESC);
CREATE UNIQUE INDEX perfis_promotor_codigo_uk ON public.perfis USING btree (promotor_codigo) WHERE (promotor_codigo IS NOT NULL);
CREATE INDEX perfis_indicado_por_ix ON public.perfis USING btree (indicado_por) WHERE (indicado_por IS NOT NULL);
CREATE UNIQUE INDEX perfis_promotor_cpf_uk ON public.perfis USING btree (promotor_cpf) WHERE (promotor_cpf IS NOT NULL);
CREATE INDEX promotor_lojas_whats_ix ON public.promotor_lojas USING btree (whats);
CREATE INDEX promotor_lojas_cnpj_ix ON public.promotor_lojas USING btree (cnpj) WHERE (cnpj IS NOT NULL);
CREATE INDEX promotor_lojas_pid_ix ON public.promotor_lojas USING btree (promotor_id, criado_em DESC);
CREATE INDEX promotor_saques_pid_ix ON public.promotor_saques USING btree (promotor_id, pedido_em DESC);
CREATE INDEX tarefas_user ON public.tarefas USING btree (user_id, data);
CREATE INDEX turnos_user_data ON public.turnos USING btree (user_id, data DESC);

-- ============================================================
-- 4. RLS ligada
-- ============================================================

alter table public.agenda enable row level security;
alter table public.backups enable row level security;
alter table public.cofre enable row level security;
alter table public.corrida_codigos enable row level security;
alter table public.corrida_msgs enable row level security;
alter table public.corrida_pos enable row level security;
alter table public.corridas enable row level security;
alter table public.corridas_det enable row level security;
alter table public.dados_pessoais enable row level security;
alter table public.denuncias enable row level security;
alter table public.despesas enable row level security;
alter table public.disponiveis enable row level security;
alter table public.encomendas enable row level security;
alter table public.erros_app enable row level security;
alter table public.gastos_fac enable row level security;
alter table public.infracoes enable row level security;
alter table public.mensagens enable row level security;
alter table public.mp_contas enable row level security;
alter table public.pagamentos enable row level security;
alter table public.perfis enable row level security;
alter table public.produtos enable row level security;
alter table public.promotor_lojas enable row level security;
alter table public.promotor_saques enable row level security;
alter table public.push_cfg enable row level security;
alter table public.push_msgs enable row level security;
alter table public.push_subs enable row level security;
alter table public.tarefas enable row level security;
alter table public.turnos enable row level security;
alter table public.veiculos enable row level security;

-- ============================================================
-- 5. Funções
-- ============================================================

CREATE OR REPLACE FUNCTION public._eh_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select admin from perfis where user_id = auth.uid()), false)
$function$
;

CREATE OR REPLACE FUNCTION public._promotor_lojas_limpa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from promotor_lojas where status = 'pendente' and criado_em < now() - interval '60 days';
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public._promotor_mov(p uuid)
 RETURNS TABLE(loja_id uuid, quando timestamp with time zone, origem text, taxa numeric, comissao numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with entregas as (
    select l.user_id loja, pg.pago_em quando,
           coalesce(pg.taxa_app, 0) + coalesce(pg.comissao, 0) taxa,
           row_number() over (partition by l.user_id order by pg.pago_em, pg.corrida_id) n
      from perfis l join pagamentos pg on pg.cliente_id = l.user_id
     where l.indicado_por = p and pg.status = 'pago'
       and pg.pago_em >= l.indicado_em and pg.pago_em < l.indicado_em + promotor_prazo()
  )
  select loja, quando, 'entrega', taxa, taxa * promotor_taxa() from entregas where n > 1
  union all
  select l.user_id, e.pago_em, 'venda', coalesce(e.taxa_app, 0), coalesce(e.taxa_app, 0) * promotor_taxa()
    from perfis l join encomendas e on e.loja_id = l.user_id
   where l.indicado_por = p and e.pago_em is not null and e.status <> 'devolvida'
     and e.pago_em >= l.indicado_em and e.pago_em < l.indicado_em + promotor_prazo()
$function$
;

CREATE OR REPLACE FUNCTION public._promotor_saldo(p uuid)
 RETURNS TABLE(ganho numeric, pendente numeric, pago numeric, disponivel numeric, proximo timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with g as (select coalesce(sum(comissao), 0) v from _promotor_mov(p)),
  s as (select coalesce(sum(valor) filter (where status = 'pedido'), 0) pend,
               coalesce(sum(valor) filter (where status = 'pago'), 0) pago,
               max(pedido_em) filter (where status <> 'recusado') ult,
               bool_or(status = 'pedido') aberto
          from promotor_saques where promotor_id = p)
  select round(g.v, 2), s.pend, s.pago, greatest(0, floor((g.v - s.pend - s.pago) * 100) / 100)::numeric(10,2),
         case when s.aberto then null when s.ult is null then now() else greatest(now(), s.ult + promotor_saque_intervalo()) end
    from g, s
$function$
;

CREATE OR REPLACE FUNCTION public.aceitar_corrida(cid uuid)
 RETURNS corridas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p record; c public.corridas; d public.disponiveis; pl text; r public.corridas;
begin
select nome, tipo, bloqueado into p from public.perfis where user_id = auth.uid();
if p.tipo is distinct from 'entregador' then raise exception 'Só entregador aceita corridas.'; end if;
if coalesce(p.bloqueado,false) then raise exception 'Conta bloqueada para análise.'; end if;
if not public.cadastro_completo() then raise exception 'Complete seu cadastro antes.'; end if;
select * into c from public.corridas where id = cid;
select * into d from public.disponiveis where user_id = auth.uid();
if c.tipo = 'frete' and (d.user_id is null or (c.veiculo = 'carroceria' and d.veiculo not in ('picape_p','picape_m','caminhao')) or (c.veiculo <> 'carroceria' and d.veiculo is distinct from c.veiculo)) then
raise exception 'Esse frete pede outro veículo.'; end if;
if (select count(*) from public.corridas where entregador_id = auth.uid() and status in ('aceita','coletada')) >= 2 then
raise exception 'Termine as corridas que já aceitou.'; end if;
select placa into pl from public.veiculos where user_id = auth.uid() and tipo = d.veiculo;
update public.corridas set status='aceita', entregador_id=auth.uid(), aceita_em=now(),
entregador_nome=coalesce(nullif(split_part(trim(coalesce(p.nome,'')),' ',1),''),'Entregador'),
ent_veiculo=d.veiculo, ent_placa=pl
where id=cid and status='aberta' and cliente_id <> auth.uid() returning * into r;
if r.id is null then raise exception 'Essa corrida já foi pega ou cancelada.'; end if;
return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.aumentar_valor(cid uuid, novo numeric)
 RETURNS corridas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.corridas;
begin
  update public.corridas
     set valor = round(novo, 2), alerta_em = null, alertas = 0, parado_avisado = false
   where id = cid and cliente_id = auth.uid() and status = 'aberta'
     and novo > valor and novo <= valor * 3 + 20 and novo <= 2000
  returning * into r;
  if r.id is null then raise exception 'Não deu para mudar o valor. O pedido pode já ter sido aceito.'; end if;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.avaliar_corrida(cid uuid, n integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.corridas set nota = greatest(1, least(5, n))
   where id = cid and cliente_id = auth.uid() and status = 'entregue' and nota is null;
end $function$
;

CREATE OR REPLACE FUNCTION public.avisar_nova_conta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare k text; nome text; tipo text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if k is null then return new; end if;
  nome := replace(replace(coalesce(new.raw_user_meta_data->>'nome', '(sem nome)'), '<', '&lt;'), '>', '&gt;');
  tipo := case when new.raw_user_meta_data->>'tipo' = 'cliente' then 'Cliente (pede entregas)' else 'Entregador' end;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'Cadernex <onboarding@resend.dev>',
      'to', jsonb_build_array('waanderson.marinho@gmail.com'),
      'subject', 'Nova conta no Cadernex: ' || nome || ' (' || split_part(tipo, ' ', 1) || ')',
      'html', '<h2>Nova conta no Cadernex</h2><p><b>Nome:</b> ' || nome || '</p><p><b>Tipo:</b> ' || tipo ||
              '</p><p><b>E-mail:</b> ' || coalesce(new.email, '') || '</p><p><b>Data:</b> ' ||
              to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
              '</p><p><b>Total de contas:</b> ' || (select count(*) from auth.users) || '</p>'
    ));
  return new;
exception when others then return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.backup_admin()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return public.backup_montar();
end $function$
;

CREATE OR REPLACE FUNCTION public.backup_auto()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d jsonb;
begin
  d := public.backup_montar();
  insert into public.backups (dados, tamanho) values (d, octet_length(d::text));
  delete from public.backups where id not in (select id from public.backups order by criado desc limit 7);
end $function$
;

CREATE OR REPLACE FUNCTION public.backup_baixar(bid bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return (select dados from public.backups where id = bid);
end $function$
;

CREATE OR REPLACE FUNCTION public.backup_montar()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t text; v jsonb; r jsonb;
begin
  r := jsonb_build_object('gerado_em', now(),
         'contas', (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'email', u.email,
                      'criado_em', u.created_at, 'ultimo_acesso', u.last_sign_in_at)), '[]'::jsonb) from auth.users u));
  foreach t in array array['perfis','dados_pessoais','veiculos','corridas','corridas_det','corrida_codigos','pagamentos',
                           'infracoes','denuncias','encomendas','produtos','turnos','despesas','cofre',
                           'agenda','tarefas','gastos_fac'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into v;
      r := r || jsonb_build_object(t, v);
    end if;
  end loop;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.backups_lista()
 RETURNS TABLE(id bigint, criado timestamp with time zone, tamanho integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query select b.id, b.criado, b.tamanho from public.backups b order by b.criado desc;
end $function$
;

CREATE OR REPLACE FUNCTION public.cadastro_completo()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.dados_pessoais where user_id = auth.uid())
$function$
;

CREATE OR REPLACE FUNCTION public.cadastros_admin()
 RETURNS TABLE(user_id uuid, nome text, email text, tipo text, loja boolean, loja_nome text, bairro text, whats text, criado_em timestamp with time zone, ultimo_acesso timestamp with time zone, veiculos text[], documentos boolean, mp boolean, bloqueado boolean, entregas bigint, pedidos bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query
    select p.user_id, coalesce(nullif(d.nome_completo,''), p.nome), u.email::text, p.tipo,
           coalesce(p.loja,false), p.loja_nome, p.loja_bairro,
           coalesce(nullif(d.celular,''), nullif(regexp_replace(coalesce(p.loja_whats, p.telefone, ''), '\D', '', 'g'), '')),
           u.created_at, u.last_sign_in_at,
           array(select replace(storage.filename(o.name), '.jpg', '') from storage.objects o
                   where o.bucket_id = 'veiculos' and (storage.foldername(o.name))[1] = p.user_id::text
                 union select v.tipo from public.veiculos v where v.user_id = p.user_id),
           d.user_id is not null,
           exists (select 1 from public.mp_contas m where m.user_id = p.user_id),
           p.bloqueado,
           (select count(*) from public.corridas c where c.entregador_id = p.user_id and c.status = 'entregue'),
           (select count(*) from public.corridas c where c.cliente_id = p.user_id)
    from public.perfis p
    join auth.users u on u.id = p.user_id
    left join public.dados_pessoais d on d.user_id = p.user_id
    order by u.created_at desc;
end $function$
;

CREATE OR REPLACE FUNCTION public.checar_veiculo(v text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
if not exists (select 1 from storage.objects where bucket_id='veiculos' and name = auth.uid()::text || '/' || v || '.jpg') then
raise exception 'Mande uma foto do seu veículo antes de ficar disponível.'; end if;
if v in ('picape_p','picape_m','caminhao') and not exists (select 1 from public.veiculos where user_id=auth.uid() and tipo=v) then
raise exception 'Cadastre a placa do veículo antes.'; end if;
if v = 'moto' and (select nascimento from public.dados_pessoais where user_id=auth.uid()) > (current_date - interval '21 years') then
raise exception 'Moto só com 21 anos ou mais (Lei 12.009/2009). De bike você já pode.'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.cnpj_valido(c text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare s int; d1 int; d2 int; i int; p1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2]; p2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
begin
  if c is null or c !~ '^[0-9A-Z]{12}[0-9]{2}$' or c ~ '^(.)\1{13}$' then return false; end if;
  s := 0; for i in 1..12 loop s := s + (ascii(substr(c,i,1)) - 48) * p1[i]; end loop;
  d1 := case when s % 11 < 2 then 0 else 11 - s % 11 end;
  s := 0; for i in 1..13 loop s := s + (ascii(substr(c,i,1)) - 48) * p2[i]; end loop;
  d2 := case when s % 11 < 2 then 0 else 11 - s % 11 end;
  return d1 = substr(c,13,1)::int and d2 = substr(c,14,1)::int;
end $function$
;

CREATE OR REPLACE FUNCTION public.contar_denuncias()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select count(*) from public.denuncias where msg_id = new.msg_id) >= 3 then
    update public.mensagens set oculta = true where id = new.msg_id;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.contar_infracoes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select count(*) from public.infracoes where alvo_id = new.alvo_id and not arquivada) >= 3 then
    update public.perfis set bloqueado = true where user_id = new.alvo_id;
    delete from public.disponiveis where user_id = new.alvo_id;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.contas_bloqueadas()
 RETURNS TABLE(user_id uuid, nome text, email text, tipo text, defesa text, motivos text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query
    select p.user_id, p.nome, u.email::text, p.tipo, p.defesa,
           array(select i.motivo || coalesce(': ' || i.detalhe, '') from public.infracoes i
                 where i.alvo_id = p.user_id and not i.arquivada order by i.created_at)
    from public.perfis p join auth.users u on u.id = p.user_id
    where p.bloqueado;
end $function$
;

CREATE OR REPLACE FUNCTION public.corrida_avisar(c corridas, op text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s text;
begin
  select segredo into s from public.push_cfg where id = 1;
  perform net.http_post(url := 'https://pwmnczoiybktyxavjbjl.supabase.co/functions/v1/push',
    body := jsonb_build_object('op', op, 'c', to_jsonb(c)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cx', s));
exception when others then null;
end $function$
;

CREATE OR REPLACE FUNCTION public.corridas_paradas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c record; s text;
  url text := 'https://pwmnczoiybktyxavjbjl.supabase.co/functions/v1/push';
begin
  select segredo into s from public.push_cfg where id = 1;
  for c in select * from public.corridas
    where status = 'aberta'
      and created_at < now() - interval '3 minutes' and created_at > now() - interval '60 minutes'
      and coalesce(alerta_em, created_at) < now() - interval '3 minutes'
      and (agendado_para is null or agendado_para < now() + interval '1 hour')
  loop
    update public.corridas set alerta_em = now(), alertas = alertas + 1 where id = c.id;
    begin
      perform net.http_post(url := url, body := jsonb_build_object('op', 'RELEMBRAR', 'c', to_jsonb(c)),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cx', s));
    exception when others then null; end;
  end loop;
  for c in select * from public.corridas
    where status = 'aberta' and not parado_avisado
      and created_at < now() - interval '10 minutes' and created_at > now() - interval '2 hours'
      and (agendado_para is null or agendado_para < now() + interval '1 hour')
  loop
    update public.corridas set parado_avisado = true where id = c.id;
    begin
      perform net.http_post(url := url, body := jsonb_build_object('op', 'PARADO', 'c', to_jsonb(c)),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cx', s));
    exception when others then null; end;
  end loop;
end $function$
;

CREATE OR REPLACE FUNCTION public.corridas_valor_ok()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.valor is null or new.valor < 8 then
    raise exception 'O valor mínimo da corrida é R$ 8,00.' using errcode = 'check_violation';
  end if;
  if new.valor > 20000 then
    raise exception 'Valor da corrida alto demais. Confira o valor digitado.' using errcode = 'check_violation';
  end if;
  if new.distancia_km is not null and (new.distancia_km < 0 or new.distancia_km > 2000) then
    raise exception 'Distância inválida. Confira os endereços.' using errcode = 'check_violation';
  end if;
  if coalesce(new.ajudantes, 0) not between 0 and 10 or coalesce(new.andares, 0) not between 0 and 50 then
    raise exception 'Número de ajudantes ou andares inválido.' using errcode = 'check_violation';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.cpf_valido(c text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare s int; d1 int; d2 int; i int;
begin
  if c !~ '^[0-9]{11}$' or c ~ '^(.)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(c,i,1)::int * (11-i); end loop;
  d1 := (s*10) % 11; if d1 = 10 then d1 := 0; end if;
  s := 0; for i in 1..10 loop s := s + substr(c,i,1)::int * (12-i); end loop;
  d2 := (s*10) % 11; if d2 = 10 then d2 := 0; end if;
  return d1 = substr(c,10,1)::int and d2 = substr(c,11,1)::int;
end $function$
;

CREATE OR REPLACE FUNCTION public.desbloquear_conta(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  update public.infracoes set arquivada = true where alvo_id = uid and not arquivada;
  update public.perfis set bloqueado = false, defesa = null where user_id = uid;
end $function$
;

CREATE OR REPLACE FUNCTION public.disponiveis_exige_selfie()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if not tem_selfie(coalesce(new.user_id, auth.uid())) then
    raise exception 'Tire uma selfie no seu perfil para ficar disponível.';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.eh_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select admin from public.perfis where user_id = auth.uid()), false)
$function$
;

CREATE OR REPLACE FUNCTION public.encomenda_criar(lj uuid, its jsonb, ende text, brr text, lat double precision, lng double precision, tel text, ob text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare lista jsonb; sub numeric; t json; nid uuid; nome text;
begin
 if coalesce((select bloqueado from perfis where user_id=auth.uid()),false) then raise exception 'Conta bloqueada para análise.'; end if;
 if not cadastro_completo() then raise exception 'Complete seu cadastro antes.'; end if;
 if lj=auth.uid() or not exists (select 1 from perfis p where p.user_id=lj and p.loja and not coalesce(p.bloqueado,false))
  or not exists (select 1 from mp_contas where user_id=lj) then raise exception 'Essa loja não está recebendo pedidos pelo app.'; end if;
 if char_length(coalesce(ende,''))<5 or char_length(coalesce(brr,''))<2 then raise exception 'Coloque o endereço e o bairro.'; end if;
 if (select count(*) from encomendas where cliente_id=auth.uid() and status in ('nova','aceita'))>=3 then raise exception 'Termine os pedidos que você já fez.'; end if;
 select jsonb_agg(jsonb_build_object('nome',p.nome,'preco',p.preco,'qtd',i.q)), sum(p.preco*i.q) into lista, sub
  from (select (x->>'id')::uuid id, least(20,greatest(1,(x->>'qtd')::int)) q from jsonb_array_elements(its) x) i
  join produtos p on p.id=i.id and p.loja_id=lj and p.ativo;
 if lista is null then raise exception 'Escolha pelo menos um produto.'; end if;
 t:=encomenda_taxa(lj,lat,lng);
 select coalesce(nullif(split_part(trim(coalesce(p.nome,'')),' ',1),''),'Cliente') into nome from perfis p where p.user_id=auth.uid();
 insert into encomendas(loja_id,cliente_nome,itens,subtotal,taxa,km,entrega_end,entrega_bairro,entrega_lat,entrega_lng,contato,obs)
 values (lj,nome,lista,sub,(t->>'taxa')::numeric,(t->>'km')::numeric,left(ende,200),left(brr,60),lat,lng,left(tel,20),left(ob,200))
 returning id into nid;
 return nid;
end $function$
;

CREATE OR REPLACE FUNCTION public.encomenda_mudar(eid uuid, acao text, cid uuid DEFAULT NULL::uuid, mot text DEFAULT NULL::text, tx numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare e encomendas;
begin
 select * into e from encomendas where id=eid;
 if e.id is null then raise exception 'Pedido não encontrado.'; end if;
 if acao='aceitar' and e.loja_id=auth.uid() and e.status='nova' then
  if coalesce(tx,e.taxa) is null or coalesce(tx,e.taxa)<0 or coalesce(tx,e.taxa)>300 then raise exception 'Coloque a taxa de entrega.'; end if;
  update encomendas set status='aceita', taxa=coalesce(tx,taxa) where id=eid;
 elsif acao='recusar' and e.loja_id=auth.uid() and e.status in ('nova','aceita') then
  update encomendas set status='recusada', motivo=left(mot,80) where id=eid;
 elsif acao='cancelar' and e.cliente_id=auth.uid() and e.status in ('nova','aceita') then
  update encomendas set status='cancelada' where id=eid;
 elsif acao='chamar' and e.loja_id=auth.uid() and e.status='paga' and exists (select 1 from corridas where id=cid and cliente_id=auth.uid()) then
  update encomendas set status='enviada', corrida_id=cid where id=eid;
 else raise exception 'Essa ação não é possível agora.'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.encomenda_taxa(lj uuid, lat double precision, lng double precision)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select case when p.loja_lat is null or lat is null then json_build_object('km',null,'taxa',null)
 else (select json_build_object('km',k,'taxa',greatest(8,round(8+0.55*k,2))) from (select round((1.3*12742*asin(sqrt(
  power(sin(radians(lat-p.loja_lat)/2),2)+cos(radians(p.loja_lat))*cos(radians(lat))*power(sin(radians(lng-p.loja_lng)/2),2))))::numeric,1) k) x) end
 from perfis p where p.user_id = lj and p.loja
$function$
;

CREATE OR REPLACE FUNCTION public.erros_admin()
 RETURNS TABLE(id bigint, msg text, onde text, tela text, versao text, aparelho text, created_at timestamp with time zone, nome text, tipo text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query
    select e.id, e.msg, e.onde, e.tela, e.versao, e.aparelho, e.created_at, p.nome, p.tipo
    from public.erros_app e left join public.perfis p on p.user_id = e.user_id
    order by e.id desc limit 100;
end $function$
;

CREATE OR REPLACE FUNCTION public.gerar_codigos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a text; b text;
begin
  a := lpad(floor(random() * 10000)::int::text, 4, '0');
  loop b := lpad(floor(random() * 10000)::int::text, 4, '0'); exit when b <> a; end loop;
  insert into public.corrida_codigos (corrida_id, coleta, entrega) values (new.id, a, b) on conflict do nothing;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.limpar_erros()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.erros_app where created_at < now() - interval '30 days';
  delete from public.erros_app where id in (select id from public.erros_app order by id desc offset 2000);
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.limpar_pos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status not in ('aceita','coletada') or new.entregador_id is distinct from old.entregador_id then
    delete from public.corrida_pos where corrida_id = new.id;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.limpar_resenha()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.mensagens where created_at < now() - interval '24 hours';
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.lojas_publicas()
 RETURNS TABLE(id uuid, nome text, bairro text, horario text, whats text, produtos bigint, recebe boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select p.user_id, p.loja_nome, p.loja_bairro, p.loja_horario, p.loja_whats,
  (select count(*) from produtos x where x.loja_id = p.user_id and x.ativo),
  exists (select 1 from mp_contas m where m.user_id = p.user_id)
 from perfis p where p.loja and coalesce(trim(p.loja_nome),'') <> '' and not coalesce(p.bloqueado,false)
 order by 7 desc, 6 desc, 2 limit 100
$function$
;

CREATE OR REPLACE FUNCTION public.media_entregador(uid uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select json_build_object('media', round(avg(nota)::numeric, 1), 'avaliacoes', count(nota),
                           'entregas', count(*) filter (where status = 'entregue'))
  from public.corridas where entregador_id = uid
$function$
;

CREATE OR REPLACE FUNCTION public.minhas_encomendas()
 RETURNS TABLE(id uuid, loja_nome text, itens jsonb, subtotal numeric, taxa numeric, total numeric, status text, motivo text, entrega_bairro text, corrida_status text, entregador_nome text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select e.id, p.loja_nome, e.itens, e.subtotal, e.taxa, e.total, e.status, e.motivo, e.entrega_bairro, c.status, c.entregador_nome, e.created_at
 from encomendas e join perfis p on p.user_id=e.loja_id left join corridas c on c.id=e.corrida_id
 where e.cliente_id=auth.uid() order by e.created_at desc limit 20
$function$
;

CREATE OR REPLACE FUNCTION public.mp_conectado()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.mp_contas where user_id = auth.uid())
$function$
;

CREATE OR REPLACE FUNCTION public.mp_desconectar()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  delete from public.mp_contas where user_id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.mp_recebe(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.mp_contas where user_id = uid)
$function$
;

CREATE OR REPLACE FUNCTION public.mp_resumo()
 RETURNS TABLE(mes text, corridas bigint, taxa numeric, movimentado numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query select to_char(p.pago_em at time zone 'America/Sao_Paulo','MM/YYYY'), count(*),
                      sum(p.taxa_app + p.comissao), sum(p.total)
                 from public.pagamentos p where p.status = 'pago'
                group by 1, date_trunc('month', p.pago_em at time zone 'America/Sao_Paulo')
                order by date_trunc('month', p.pago_em at time zone 'America/Sao_Paulo') desc limit 6;
end $function$
;

CREATE OR REPLACE FUNCTION public.mudar_corrida(cid uuid, acao text, codigo text DEFAULT NULL::text)
 RETURNS corridas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.corridas; r public.corridas; k public.corrida_codigos; espera int := 10; certo text; tipo text;
begin
  select * into c from public.corridas where id = cid for update;
  if c.id is null then raise exception 'Corrida não encontrada.'; end if;

  -- confere o código quando a ação pede
  tipo := case acao when 'coletada' then 'coleta' when 'devolvida' then 'coleta' when 'entregue' then 'entrega' end;
  if tipo is not null and c.entregador_id = auth.uid() then
    select * into k from public.corrida_codigos where corrida_id = cid for update;
    if k.corrida_id is not null then
      if k.bloq_ate is not null and k.bloq_ate > now() then
        raise exception 'Muitos códigos errados. Espere % min e tente de novo.', ceil(extract(epoch from k.bloq_ate - now()) / 60)::int;
      end if;
      certo := case tipo when 'coleta' then k.coleta else k.entrega end;
      if coalesce(regexp_replace(codigo, '\D', '', 'g'), '') <> certo then
        -- erro: conta a tentativa e devolve vazio (sem exception, para a contagem ficar salva)
        update public.corrida_codigos
           set erros = case when erros + 1 >= 5 then 0 else erros + 1 end,
               bloq_ate = case when erros + 1 >= 5 then now() + interval '10 minutes' else null end
         where corrida_id = cid;
        return null;
      end if;
      update public.corrida_codigos set erros = 0, bloq_ate = null where corrida_id = cid;
    end if;
  end if;

  if acao = 'coletada' and c.entregador_id = auth.uid() and c.status = 'aceita' then
    update public.corridas set status='coletada', coletada_em=now() where id=cid returning * into r;

  elsif acao = 'entregue' and c.entregador_id = auth.uid() and c.status = 'coletada' then
    if c.retorno_em is not null then raise exception 'Você já está voltando com a encomenda. Toque em "Devolvi no local de coleta".'; end if;
    update public.corridas set status='entregue', entregue_em=now() where id=cid returning * into r;

  elsif acao = 'ausente' and c.entregador_id = auth.uid() and c.status = 'coletada' then
    if c.ausente_em is not null then return c; end if;
    update public.corridas set ausente_em=now() where id=cid returning * into r;
    insert into public.corrida_msgs (corrida_id, user_id, texto) values (cid, auth.uid(),
      'Cheguei no endereço de entrega e ninguém atendeu. Vou esperar até 10 minutos. Se ninguém receber, volto com a encomenda para o local de coleta.');
    perform public.corrida_avisar(r, 'AUSENTE');

  elsif acao = 'retornar' and c.entregador_id = auth.uid() and c.status = 'coletada' then
    if c.ausente_em is null then raise exception 'Primeiro toque em "Ninguém atendeu" e espere 10 minutos.'; end if;
    if c.retorno_em is not null then return c; end if;
    if c.ausente_em > now() - make_interval(mins => espera) then
      raise exception 'Espere completar 10 minutos no local antes de voltar.'; end if;
    update public.corridas set retorno_em=now(), retorno_valor=0 where id=cid returning * into r;
    insert into public.corrida_msgs (corrida_id, user_id, texto) values (cid, auth.uid(),
      'Esperei 10 minutos e ninguém recebeu. Estou voltando com a encomenda para o local de coleta, sem custo extra.');
    perform public.corrida_avisar(r, 'RETORNO');

  elsif acao = 'devolvida' and c.entregador_id = auth.uid() and c.status = 'coletada' then
    if c.retorno_em is null then raise exception 'Essa ação não é possível agora.'; end if;
    update public.corridas set status='entregue', entregue_em=now(), devolvida_em=now() where id=cid returning * into r;

  elsif acao = 'devolver' and c.entregador_id = auth.uid() and c.status = 'aceita' then
    update public.corridas set status='aberta', entregador_id=null, entregador_nome=null, aceita_em=null,
           ent_veiculo=null, ent_placa=null
     where id=cid returning * into r;

  elsif acao = 'cancelar' and c.cliente_id = auth.uid() and c.status in ('aberta','aceita') then
    update public.corridas set status='cancelada' where id=cid returning * into r;

  else
    raise exception 'Essa ação não é possível agora.';
  end if;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.online_admin()
 RETURNS TABLE(user_id uuid, nome text, veiculo text, regiao text, desde timestamp with time zone, gps boolean, lat double precision, lng double precision, whats text, em_corrida bigint, entregas_hoje bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query
    select d.user_id, coalesce(nullif(dp.nome_completo, ''), p.nome, d.nome)::text, d.veiculo, d.regiao, d.atualizado_em,
           (d.lat is not null and d.pos_em > now() - interval '30 minutes'),
           round(d.lat::numeric, 3)::double precision, round(d.lng::numeric, 3)::double precision,
           coalesce(nullif(dp.celular, ''), regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g'))::text,
           (select count(*) from public.corridas c where c.entregador_id = d.user_id and c.status in ('aceita','coletada')),
           (select count(*) from public.corridas c where c.entregador_id = d.user_id and c.status = 'entregue'
              and c.entregue_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
    from public.disponiveis d
    left join public.perfis p on p.user_id = d.user_id
    left join public.dados_pessoais dp on dp.user_id = d.user_id
    where d.atualizado_em > now() - interval '4 hours'
    order by d.atualizado_em desc;
end $function$
;

CREATE OR REPLACE FUNCTION public.parados_admin()
 RETURNS TABLE(id uuid, cliente text, whats text, coleta_bairro text, entrega_bairro text, valor numeric, distancia_km numeric, created_at timestamp with time zone, alertas integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query
    select c.id, coalesce(nullif(p.loja_nome, ''), p.nome, c.cliente_nome)::text,
           coalesce(nullif(d.celular, ''), regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g'))::text,
           c.coleta_bairro, c.entrega_bairro, c.valor::numeric, c.distancia_km::numeric, c.created_at, c.alertas
    from public.corridas c
    left join public.perfis p on p.user_id = c.cliente_id
    left join public.dados_pessoais d on d.user_id = c.cliente_id
    where c.status = 'aberta' and c.created_at < now() - interval '10 minutes'
      and (c.agendado_para is null or c.agendado_para < now() + interval '1 hour')
    order by c.created_at;
end $function$
;

CREATE OR REPLACE FUNCTION public.perfis_guarda_promotor()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.promotor := false; new.promotor_codigo := null; new.promotor_pix := null; new.promotor_desde := null;
    new.indicado_por := null; new.indicado_em := null;
    new.promotor_nome := null; new.promotor_cpf := null; new.promotor_nasc := null;
    new.promotor_whats := null; new.promotor_cidade := null; new.promotor_uf := null;
    new.promotor_termos_em := null; new.promotor_termos_versao := null;
  else
    new.promotor := old.promotor; new.promotor_codigo := old.promotor_codigo; new.promotor_pix := old.promotor_pix;
    new.promotor_desde := old.promotor_desde; new.indicado_por := old.indicado_por; new.indicado_em := old.indicado_em;
    new.promotor_nome := old.promotor_nome; new.promotor_cpf := old.promotor_cpf; new.promotor_nasc := old.promotor_nasc;
    new.promotor_whats := old.promotor_whats; new.promotor_cidade := old.promotor_cidade; new.promotor_uf := old.promotor_uf;
    new.promotor_termos_em := old.promotor_termos_em; new.promotor_termos_versao := old.promotor_termos_versao;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.perfis_uma_loja()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare eh_loja boolean := coalesce(new.loja, false) and coalesce(trim(new.loja_nome), '') <> '';
  era_loja boolean := tg_op = 'UPDATE' and coalesce(old.loja, false) and coalesce(trim(old.loja_nome), '') <> '';
  w text := nullif(regexp_replace(coalesce(new.loja_whats, ''), '\D', '', 'g'), '');
  c text := nullif(regexp_replace(coalesce(new.loja_cnpj, ''), '\D', '', 'g'), '');
begin
  if eh_loja and coalesce(new.promotor, false)
     and (not era_loja or (tg_op = 'UPDATE' and not coalesce(old.promotor, false))) then
    raise exception 'loja_promotor';
  end if;
  if eh_loja and (w is not null or c is not null)
     and (tg_op = 'INSERT' or not era_loja
          or w is distinct from nullif(regexp_replace(coalesce(old.loja_whats, ''), '\D', '', 'g'), '')
          or c is distinct from nullif(regexp_replace(coalesce(old.loja_cnpj, ''), '\D', '', 'g'), '')) then
    if exists (select 1 from perfis p where p.user_id <> new.user_id and coalesce(p.loja, false)
                 and coalesce(trim(p.loja_nome), '') <> ''
                 and ((w is not null and regexp_replace(coalesce(p.loja_whats, ''), '\D', '', 'g') = w)
                   or (c is not null and regexp_replace(coalesce(p.loja_cnpj, ''), '\D', '', 'g') = c))) then
      raise exception 'loja_duplicada';
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.preparar_corrida()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pf record;
begin
select nome,bloqueado,loja,loja_nome into pf from perfis where user_id=auth.uid();
if coalesce(pf.bloqueado,false) then raise exception 'Conta bloqueada para análise.'; end if;
if not cadastro_completo() then raise exception 'Complete seu cadastro antes.'; end if;
if new.tipo='frete' and new.veiculo not in ('carroceria','picape_p','picape_m','caminhao') then raise exception 'Escolha o veículo do frete.'; end if;
if new.tipo='entrega' then
if new.veiculo not in ('qualquer','bike','moto') then raise exception 'Pra frete, escolha Frete e mudança.'; end if;
new.ajudantes:=0; new.andares:=0; end if;
if new.agendado_para<now()-interval '10 minutes' then raise exception 'A data do frete já passou.'; end if;
new.cliente_id:=auth.uid(); new.status:='aberta';
new.entregador_id:=null; new.entregador_nome:=null; new.nota:=null;
new.aceita_em:=null; new.coletada_em:=null; new.entregue_em:=null;
new.ent_veiculo:=null; new.ent_placa:=null;
new.loja:=coalesce(pf.loja,false) and coalesce(trim(pf.loja_nome),'')<>'';
new.cliente_nome:=case when new.loja then left(trim(pf.loja_nome),40) else coalesce(nullif(split_part(trim(coalesce(pf.nome,'')),' ',1),''),'Cliente') end;
if (select count(*) from corridas where cliente_id=auth.uid() and status in ('aberta','aceita','coletada'))>=(case when new.loja then 15 else 10 end) then
raise exception 'Você já tem muitos pedidos em andamento. Espere terminar algum.'; end if;
return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.preparar_dados()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.user_id := auth.uid();
  if tg_op = 'UPDATE' then -- documentos não mudam pelo app
    new.cpf := old.cpf; new.nascimento := old.nascimento; new.cnpj := old.cnpj; new.empresa_nome := old.empresa_nome;
    return new;
  end if;
  if new.cnpj is not null then
    new.cnpj := upper(regexp_replace(new.cnpj, '[^0-9A-Za-z]', '', 'g'));
    if coalesce((select tipo from public.perfis where user_id = auth.uid()), '') = 'entregador' then
      raise exception 'Entregador se cadastra com CPF.'; end if;
    if not public.cnpj_valido(new.cnpj) then raise exception 'CNPJ inválido. Confira os números.'; end if;
    new.empresa_nome := left(trim(coalesce(new.empresa_nome, '')), 80);
    if char_length(new.empresa_nome) < 2 then raise exception 'Coloque o nome da empresa.'; end if;
    if exists (select 1 from public.dados_pessoais where cnpj = new.cnpj and user_id <> new.user_id) then
      raise exception 'Esse CNPJ já está cadastrado em outra conta.'; end if;
    new.cpf := null; new.nascimento := null;
    -- a conta vira loja: o nome da empresa aparece nas corridas e pode ter até 15 pedidos abertos
    update public.perfis set loja = true, loja_nome = coalesce(nullif(trim(loja_nome), ''), new.empresa_nome)
      where user_id = new.user_id;
  else
    new.empresa_nome := null;
    if not public.cpf_valido(new.cpf) then raise exception 'CPF inválido. Confira os números.'; end if;
    if new.nascimento is null or new.nascimento > (current_date - interval '18 years') then
      raise exception 'É preciso ter 18 anos ou mais.'; end if;
    if new.nascimento < date '1920-01-01' then raise exception 'Confira a data de nascimento.'; end if;
    if exists (select 1 from public.dados_pessoais where cpf = new.cpf and user_id <> new.user_id) then
      raise exception 'Esse CPF já está cadastrado em outra conta.'; end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.preparar_disponivel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p record;
begin
select nome, tipo, bloqueado into p from public.perfis where user_id = auth.uid();
if p.tipo is distinct from 'entregador' then raise exception 'Só entregador fica disponível.'; end if;
if coalesce(p.bloqueado,false) then raise exception 'Conta bloqueada para análise.'; end if;
if not public.cadastro_completo() then raise exception 'Complete seu cadastro antes.'; end if;
if tg_op = 'INSERT' or new.veiculo is distinct from old.veiculo then perform public.checar_veiculo(new.veiculo); end if;
new.user_id := auth.uid();
new.nome := coalesce(nullif(split_part(trim(coalesce(p.nome,'')),' ',1),''),'Entregador');
if new.lat is not null and new.lng is not null and new.lat between -90 and 90 and new.lng between -180 and 180 then
new.lat := round((new.lat/0.004)::numeric)*0.004; new.lng := round((new.lng/0.004)::numeric)*0.004;
if tg_op='INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng then new.pos_em := now(); end if;
else new.lat := null; new.lng := null; new.pos_em := null; end if;
if tg_op='UPDATE' and (new.lat is distinct from old.lat or new.lng is distinct from old.lng) and new.veiculo=old.veiculo and new.regiao is not distinct from old.regiao and old.atualizado_em > now() - interval '3 hours' then
new.atualizado_em := old.atualizado_em; else new.atualizado_em := now(); end if;
return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.preparar_infracao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.corridas;
begin
  select * into c from public.corridas where id = new.corrida_id;
  if c.id is null or c.entregador_id is null or c.status = 'aberta' then
    raise exception 'Só dá pra relatar problema de corrida que foi aceita.';
  end if;
  new.autor_id := auth.uid(); new.arquivada := false;
  if auth.uid() = c.cliente_id then new.alvo_id := c.entregador_id;
  elsif auth.uid() = c.entregador_id then new.alvo_id := c.cliente_id;
  else raise exception 'Você não participou dessa corrida.'; end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.preparar_mensagem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p record;
begin
  new.user_id := auth.uid();
  new.oculta := false;
  new.texto := trim(new.texto);
  select nome, apoiador into p from public.perfis where user_id = auth.uid();
  new.nome := coalesce(nullif(split_part(trim(coalesce(p.nome, '')), ' ', 1), ''), 'Entregador');
  new.apoiador := coalesce(p.apoiador, false);
  if exists (select 1 from public.mensagens where user_id = auth.uid() and created_at > now() - interval '3 seconds') then
    raise exception 'Calma! Espere uns segundos entre as mensagens.';
  end if;
  if (select count(*) from public.mensagens where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Muitas mensagens seguidas. Espere um minuto.';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.preparar_veiculo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 new.user_id := auth.uid();
 new.placa := upper(regexp_replace(coalesce(new.placa,''), '[^A-Za-z0-9]', '', 'g'));
 new.rntrc := nullif(regexp_replace(coalesce(new.rntrc,''), '[^0-9]', '', 'g'), '');
 new.atualizado_em := now();
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_convite_info(tk text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select json_build_object('loja', l.nome, 'promotor', coalesce(nullif(p.nome, ''), 'promotor'), 'status', l.status)
    from promotor_lojas l left join perfis p on p.user_id = l.promotor_id
   where l.convite = lower(trim(tk))
$function$
;

CREATE OR REPLACE FUNCTION public.promotor_entrar(pix text, dados jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cod text; alfa text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; me perfis;
  v_cpf text; v_w text; v_nasc date; v_nome text; v_cid text; v_uf text;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  pix := nullif(trim(pix), '');
  if pix is null or length(pix) < 5 or length(pix) > 120 then raise exception 'pix'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found then raise exception 'perfil'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;

  if dados is not null then
    v_nome := trim(regexp_replace(coalesce(dados->>'nome', ''), '\s+', ' ', 'g'));
    v_cpf := regexp_replace(coalesce(dados->>'cpf', ''), '\D', '', 'g');
    v_w := regexp_replace(coalesce(dados->>'whats', ''), '\D', '', 'g');
    v_cid := trim(coalesce(dados->>'cidade', ''));
    v_uf := upper(trim(coalesce(dados->>'uf', '')));
    begin v_nasc := (dados->>'nasc')::date; exception when others then v_nasc := null; end;
    if length(v_nome) < 5 or position(' ' in v_nome) = 0 then raise exception 'dados_nome'; end if;
    if me.promotor_cpf is not null then v_cpf := me.promotor_cpf;
    elsif length(v_cpf) <> 11 then raise exception 'dados_cpf';
    elsif exists (select 1 from perfis where promotor_cpf = v_cpf and user_id <> auth.uid()) then raise exception 'dados_cpf_usado';
    end if;
    if v_nasc is null or v_nasc > (current_date - interval '18 years') or v_nasc < date '1920-01-01' then raise exception 'dados_idade'; end if;
    if length(v_w) not in (10, 11) then raise exception 'dados_whats'; end if;
    if length(v_cid) < 2 then raise exception 'dados_cidade'; end if;
    if length(v_uf) <> 2 then raise exception 'dados_uf'; end if;
    if me.promotor_termos_em is null and coalesce(dados->>'termos', '') <> '1' then raise exception 'dados_termos'; end if;
  elsif me.promotor_cpf is null then
    raise exception 'dados_faltam';
  end if;
  if not coalesce(me.promotor, false) and not tem_selfie(auth.uid()) then raise exception 'selfie_falta'; end if;

  cod := me.promotor_codigo;
  while cod is null loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(alfa, 1 + floor(random() * length(alfa))::int, 1); end loop;
    if exists (select 1 from perfis where promotor_codigo = cod) then cod := null; end if;
  end loop;
  update perfis set promotor = true, promotor_codigo = cod, promotor_pix = pix,
                    promotor_desde = coalesce(promotor_desde, now()),
                    promotor_nome = coalesce(v_nome, promotor_nome), promotor_cpf = coalesce(v_cpf, promotor_cpf),
                    promotor_nasc = coalesce(v_nasc, promotor_nasc), promotor_whats = coalesce(v_w, promotor_whats),
                    promotor_cidade = coalesce(left(v_cid, 60), promotor_cidade), promotor_uf = coalesce(v_uf, promotor_uf),
                    promotor_termos_em = case when dados->>'termos' = '1' then now() else promotor_termos_em end,
                    promotor_termos_versao = case when dados->>'termos' = '1' then '2026-10-14' else promotor_termos_versao end
   where user_id = auth.uid();
  return cod;
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_loja_aceitar(tk text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me perfis; l promotor_lojas; p perfis; ende text;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into l from promotor_lojas where convite = lower(trim(tk)) for update;
  if not found then raise exception 'convite'; end if;
  if l.status = 'ativa' then
    if l.loja_id = auth.uid() then return 'ja_ativa'; end if;
    raise exception 'convite_usado';
  end if;
  if l.promotor_id = auth.uid() then raise exception 'proprio'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found then raise exception 'perfil'; end if;
  if me.indicado_por is not null and me.indicado_por <> l.promotor_id then raise exception 'ja_vinculada'; end if;
  select * into p from perfis where user_id = l.promotor_id;

  ende := l.rua || ', ' || l.numero || coalesce(' - ' || l.complemento, '');
  update perfis set
    tipo = coalesce(tipo, 'cliente'),
    nome = coalesce(nullif(nome, ''), l.responsavel),
    telefone = coalesce(nullif(telefone, ''), l.whats),
    loja = true, loja_nome = l.nome, loja_ramo = coalesce(l.ramo, loja_ramo),
    loja_end = ende, loja_bairro = l.bairro, loja_cep = l.cep, loja_cidade = l.cidade, loja_uf = l.uf,
    loja_lat = coalesce(l.lat, loja_lat), loja_lng = coalesce(l.lng, loja_lng),
    loja_whats = l.whats, loja_horario = coalesce(l.horario, loja_horario), loja_cnpj = coalesce(l.cnpj, loja_cnpj),
    loja_responsavel = l.responsavel, loja_email = coalesce(l.email, loja_email),
    end_padrao = coalesce(nullif(end_padrao, ''), ende),
    indicado_por = l.promotor_id, indicado_em = coalesce(indicado_em, now())
  where user_id = auth.uid();
  update promotor_lojas set status = 'ativa', loja_id = auth.uid(), ativada_em = now() where id = l.id;
  return coalesce(nullif(p.nome, ''), 'promotor');
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_loja_apagar(lid bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from promotor_lojas where id = lid and promotor_id = auth.uid() and status = 'pendente';
  if not found then raise exception 'nao_apaga'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_loja_salvar(d jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me perfis; w text; c text; cep text; tk text; alfa text := 'abcdefghjkmnpqrstuvwxyz23456789'; i int; novo promotor_lojas;
  t text;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;

  w := regexp_replace(coalesce(d->>'whats', ''), '\D', '', 'g');
  c := nullif(regexp_replace(coalesce(d->>'cnpj', ''), '\D', '', 'g'), '');
  cep := regexp_replace(coalesce(d->>'cep', ''), '\D', '', 'g');
  foreach t in array array['nome', 'responsavel', 'rua', 'numero', 'bairro', 'cidade'] loop
    if length(trim(coalesce(d->>t, ''))) < 1 then raise exception 'falta_%', t; end if;
  end loop;
  if length(w) not in (10, 11) then raise exception 'whats'; end if;
  if length(cep) <> 8 then raise exception 'cep'; end if;
  if c is not null and length(c) <> 14 then raise exception 'cnpj'; end if;
  if length(coalesce(d->>'uf', '')) <> 2 then raise exception 'falta_uf'; end if;

  if exists (select 1 from perfis p where p.loja and (
        regexp_replace(coalesce(p.loja_whats, ''), '\D', '', 'g') = w
     or (c is not null and regexp_replace(coalesce(p.loja_cnpj, ''), '\D', '', 'g') = c))) then
    raise exception 'loja_existe';
  end if;
  if exists (select 1 from promotor_lojas l where l.promotor_id <> auth.uid()
               and (l.status = 'ativa' or l.criado_em > now() - interval '30 days')
               and (l.whats = w or (c is not null and l.cnpj = c))) then
    raise exception 'outro_promotor';
  end if;
  if exists (select 1 from promotor_lojas l where l.promotor_id = auth.uid() and (l.whats = w or (c is not null and l.cnpj = c))) then
    raise exception 'repetida';
  end if;

  loop
    tk := '';
    for i in 1..10 loop tk := tk || substr(alfa, 1 + floor(random() * length(alfa))::int, 1); end loop;
    exit when not exists (select 1 from promotor_lojas where convite = tk);
  end loop;

  insert into promotor_lojas (promotor_id, convite, nome, ramo, responsavel, whats, telefone, email, cnpj, cep, rua, numero,
                              complemento, bairro, cidade, uf, lat, lng, geo_origem, horario, obs)
  values (auth.uid(), tk, left(trim(d->>'nome'), 60), nullif(trim(d->>'ramo'), ''), left(trim(d->>'responsavel'), 80), w,
          nullif(regexp_replace(coalesce(d->>'telefone', ''), '\D', '', 'g'), ''), nullif(lower(trim(d->>'email')), ''), c, cep,
          left(trim(d->>'rua'), 120), left(trim(d->>'numero'), 20), nullif(left(trim(d->>'complemento'), 60), ''),
          left(trim(d->>'bairro'), 60), left(trim(d->>'cidade'), 60), upper(d->>'uf'),
          nullif(d->>'lat', '')::double precision, nullif(d->>'lng', '')::double precision,
          case when d->>'lat' is null or d->>'lat' = '' then null else nullif(d->>'geo', '') end,
          nullif(left(trim(d->>'horario'), 60), ''), nullif(left(trim(d->>'obs'), 300), ''))
  returning * into novo;
  return json_build_object('id', novo.id, 'convite', novo.convite);
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_meu()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(nullif(p.nome, ''), 'promotor') from perfis me join perfis p on p.user_id = me.indicado_por
   where me.user_id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.promotor_meus_dados()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select json_build_object('nome', promotor_nome,
           'cpf', case when promotor_cpf is null then null else '***.' || substr(promotor_cpf, 4, 3) || '.' || substr(promotor_cpf, 7, 3) || '-**' end,
           'nasc', promotor_nasc, 'whats', promotor_whats, 'cidade', promotor_cidade, 'uf', promotor_uf,
           'completo', promotor_cpf is not null, 'termos', promotor_termos_em)
    from perfis where user_id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.promotor_painel()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me perfis; r json;
begin
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then return json_build_object('promotor', false); end if;
  with mov as (select * from _promotor_mov(auth.uid())),
  lojas as (
    select l.user_id, l.loja_nome, l.loja_bairro, l.indicado_em,
           coalesce(sum(m.taxa), 0) taxa, coalesce(sum(m.comissao), 0) comissao, count(m.*) mov, max(m.quando) ultimo
      from perfis l left join mov m on m.loja_id = l.user_id
     where l.indicado_por = auth.uid()
     group by l.user_id, l.loja_nome, l.loja_bairro, l.indicado_em),
  sq as (select * from promotor_saques where promotor_id = auth.uid()),
  sd as (select * from _promotor_saldo(auth.uid()))
  select json_build_object(
    'promotor', true,
    'taxa', promotor_taxa(),
    'meses', extract(year from promotor_prazo()) * 12 + extract(month from promotor_prazo()),
    'codigo', me.promotor_codigo,
    'pix', me.promotor_pix,
    'desde', me.promotor_desde,
    'ganho', (select ganho from sd),
    'disponivel', (select disponivel from sd),
    'pendente', (select pendente from sd),
    'pago', (select pago from sd),
    'proximo', (select proximo from sd),
    'minimo', promotor_saque_minimo(),
    'mes', round((select coalesce(sum(comissao), 0) from mov
                   where quando >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'), 2),
    'lojas', coalesce((select json_agg(json_build_object('nome', loja_nome, 'bairro', loja_bairro, 'desde', indicado_em, 'ate', indicado_em + promotor_prazo(),
                        'taxa', round(taxa, 2), 'comissao', round(comissao, 2), 'mov', mov, 'ultimo', ultimo)
                        order by comissao desc, indicado_em desc) from lojas), '[]'::json),
    'saques', coalesce((select json_agg(json_build_object('valor', valor, 'status', status, 'pedido', pedido_em, 'pago', pago_em, 'obs', obs, 'pix', pix)
                        order by pedido_em desc) from sq), '[]'::json)
  ) into r;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_prazo()
 RETURNS interval
 LANGUAGE sql
 IMMUTABLE
AS $function$ select interval '24 months' $function$
;

CREATE OR REPLACE FUNCTION public.promotor_sacar()
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me perfis; sd record;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  perform pg_advisory_xact_lock(hashtext('promotor_saque:' || auth.uid()::text));
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;
  if me.promotor_cpf is null then raise exception 'dados_faltam'; end if;
  if not tem_selfie(auth.uid()) then raise exception 'selfie_falta'; end if;
  if coalesce(me.promotor_pix, '') = '' then raise exception 'pix'; end if;
  select * into sd from _promotor_saldo(auth.uid());
  if sd.proximo is null then raise exception 'saque_aberto'; end if;
  if sd.proximo > now() then raise exception 'semana'; end if;
  if sd.disponivel < promotor_saque_minimo() then raise exception 'minimo'; end if;
  insert into promotor_saques (promotor_id, valor, pix) values (auth.uid(), sd.disponivel, me.promotor_pix);
  return sd.disponivel;
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_sair()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me perfis; sd record;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  select * into sd from _promotor_saldo(auth.uid());
  if sd.pendente > 0 then raise exception 'saque_aberto'; end if;
  if sd.disponivel >= promotor_saque_minimo() then raise exception 'saldo_sacar'; end if;
  if to_regclass('public.promotor_lojas') is not null then
    execute 'delete from public.promotor_lojas where promotor_id = $1 and status = ''pendente''' using auth.uid();
  end if;
  update perfis set promotor = false, promotor_codigo = null, promotor_pix = null, promotor_whats = null,
                    promotor_nasc = null, promotor_cidade = null, promotor_uf = null
   where user_id = auth.uid();
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_saque_intervalo()
 RETURNS interval
 LANGUAGE sql
 IMMUTABLE
AS $function$ select interval '7 days' $function$
;

CREATE OR REPLACE FUNCTION public.promotor_saque_minimo()
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$ select 5.00::numeric $function$
;

CREATE OR REPLACE FUNCTION public.promotor_saque_mudar(sid bigint, acao text, nota text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not _eh_admin() then raise exception 'admin'; end if;
  if acao not in ('pagar', 'recusar') then raise exception 'acao'; end if;
  update promotor_saques
     set status = case acao when 'pagar' then 'pago' else 'recusado' end,
         pago_em = case acao when 'pagar' then now() end,
         obs = nullif(trim(nota), ''), feito_por = auth.uid()
   where id = sid and status = 'pedido';
  if not found then raise exception 'saque'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.promotor_taxa()
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$ select 0.02::numeric $function$
;

CREATE OR REPLACE FUNCTION public.promotor_vincular(cod text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me perfis; p perfis;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found or not coalesce(me.loja, false) or coalesce(trim(me.loja_nome), '') = '' then raise exception 'nao_loja'; end if;
  if me.indicado_por is not null then raise exception 'ja_vinculada'; end if;
  select * into p from perfis where promotor and promotor_codigo = upper(trim(cod));
  if not found then raise exception 'codigo'; end if;
  if p.user_id = auth.uid() then raise exception 'proprio'; end if;
  update perfis set indicado_por = p.user_id, indicado_em = now() where user_id = auth.uid();
  return coalesce(nullif(p.nome, ''), 'promotor');
end $function$
;

CREATE OR REPLACE FUNCTION public.promotores_admin()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not _eh_admin() then raise exception 'admin'; end if;
  return json_build_object(
    'saques', coalesce((select json_agg(json_build_object('id', q.id, 'valor', q.valor, 'pix', q.pix, 'pedido', q.pedido_em,
                 'nome', coalesce(p.promotor_nome, p.nome), 'cpf', p.promotor_cpf, 'codigo', p.promotor_codigo,
                 'whats', coalesce(p.promotor_whats, p.loja_whats, p.telefone)) order by q.pedido_em)
               from promotor_saques q join perfis p on p.user_id = q.promotor_id where q.status = 'pedido'), '[]'::json),
    'promotores', coalesce((select json_agg(x order by x.ganho desc, x.lojas desc) from (
      select p.user_id id, coalesce(p.promotor_nome, p.nome) nome, p.promotor_cpf cpf, p.promotor_nasc nasc,
             p.promotor_cidade cidade, p.promotor_uf uf, coalesce(p.promotor_whats, p.loja_whats, p.telefone) whats,
             p.promotor_pix pix, p.promotor_codigo codigo, p.promotor_desde desde, p.promotor_termos_em termos,
             (select count(*) from perfis l where l.indicado_por = p.user_id) lojas,
             sd.ganho, sd.pago, sd.pendente, sd.disponivel
        from perfis p cross join lateral _promotor_saldo(p.user_id) sd
       where p.promotor) x), '[]'::json));
end $function$
;

CREATE OR REPLACE FUNCTION public.proteger_apoiador()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then new.apoiador := false; new.admin := false; new.bloqueado := false;
    else new.apoiador := old.apoiador; new.admin := old.admin; new.bloqueado := old.bloqueado; end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.push_aviso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select segredo into s from push_cfg where id = 1;
  perform net.http_post(
    url := 'https://pwmnczoiybktyxavjbjl.supabase.co/functions/v1/push',
    body := jsonb_build_object('op', tg_op, 'c', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cx', s));
  return new;
exception when others then return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.push_enc()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s text;
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
 select segredo into s from push_cfg where id=1;
 perform net.http_post(url:='https://pwmnczoiybktyxavjbjl.supabase.co/functions/v1/push',
  body:=jsonb_build_object('op',tg_op,'t','encomendas','c',to_jsonb(new)-'entrega_end'-'contato'-'entrega_lat'-'entrega_lng'),
  headers:=jsonb_build_object('Content-Type','application/json','x-cx',s));
 return new;
exception when others then return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.push_registrar(ep text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into push_subs(endpoint, user_id) values (ep, auth.uid())
  on conflict (endpoint) do update set user_id = auth.uid(), criado = now();
$function$
;

CREATE OR REPLACE FUNCTION public.push_sair(ep text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  delete from push_subs where endpoint = ep and user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.tem_selfie(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
  select exists (select 1 from storage.objects where bucket_id = 'perfis' and name = u::text || '/foto.jpg')
$function$
;


-- ============================================================
-- 6. Gatilhos
-- ============================================================

CREATE TRIGGER contar_denuncias AFTER INSERT ON public.denuncias FOR EACH ROW EXECUTE FUNCTION contar_denuncias();
CREATE TRIGGER contar_infracoes AFTER INSERT ON public.infracoes FOR EACH ROW EXECUTE FUNCTION contar_infracoes();
CREATE TRIGGER corridas_valor_ok BEFORE INSERT OR UPDATE OF valor, distancia_km, ajudantes, andares ON public.corridas FOR EACH ROW EXECUTE FUNCTION corridas_valor_ok();
CREATE TRIGGER disponiveis_exige_selfie BEFORE INSERT OR UPDATE OF veiculo, regiao ON public.disponiveis FOR EACH ROW EXECUTE FUNCTION disponiveis_exige_selfie();
CREATE TRIGGER gerar_codigos AFTER INSERT ON public.corridas FOR EACH ROW EXECUTE FUNCTION gerar_codigos();
CREATE TRIGGER limpar_erros AFTER INSERT ON public.erros_app FOR EACH STATEMENT EXECUTE FUNCTION limpar_erros();
CREATE TRIGGER limpar_pos AFTER UPDATE OF status, entregador_id ON public.corridas FOR EACH ROW EXECUTE FUNCTION limpar_pos();
CREATE TRIGGER limpar_resenha AFTER INSERT ON public.mensagens FOR EACH STATEMENT EXECUTE FUNCTION limpar_resenha();
CREATE TRIGGER perfis_guarda_promotor BEFORE INSERT OR UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION perfis_guarda_promotor();
CREATE TRIGGER perfis_uma_loja BEFORE INSERT OR UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION perfis_uma_loja();
CREATE TRIGGER preparar_corrida BEFORE INSERT ON public.corridas FOR EACH ROW EXECUTE FUNCTION preparar_corrida();
CREATE TRIGGER preparar_dados BEFORE INSERT OR UPDATE ON public.dados_pessoais FOR EACH ROW EXECUTE FUNCTION preparar_dados();
CREATE TRIGGER preparar_disponivel BEFORE INSERT OR UPDATE ON public.disponiveis FOR EACH ROW EXECUTE FUNCTION preparar_disponivel();
CREATE TRIGGER preparar_infracao BEFORE INSERT ON public.infracoes FOR EACH ROW EXECUTE FUNCTION preparar_infracao();
CREATE TRIGGER preparar_mensagem BEFORE INSERT ON public.mensagens FOR EACH ROW EXECUTE FUNCTION preparar_mensagem();
CREATE TRIGGER preparar_veiculo BEFORE INSERT OR UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION preparar_veiculo();
CREATE TRIGGER promotor_lojas_limpa AFTER INSERT ON public.promotor_lojas FOR EACH STATEMENT EXECUTE FUNCTION _promotor_lojas_limpa();
CREATE TRIGGER proteger_apoiador BEFORE INSERT OR UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION proteger_apoiador();
CREATE TRIGGER push_aviso AFTER INSERT OR UPDATE OF status ON public.corridas FOR EACH ROW EXECUTE FUNCTION push_aviso();
CREATE TRIGGER push_enc AFTER INSERT OR UPDATE OF status ON public.encomendas FOR EACH ROW EXECUTE FUNCTION push_enc();

-- ============================================================
-- 7. Regras de acesso (RLS)
-- ============================================================

create policy dono_agenda on public.agenda as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy dono_cofre on public.cofre as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy ver_meus_codigos on public.corrida_codigos as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corrida_codigos.corrida_id) AND (c.cliente_id = auth.uid())))));
create policy ver_msgs_corrida on public.corrida_msgs as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corrida_msgs.corrida_id) AND ((c.cliente_id = auth.uid()) OR (c.entregador_id = auth.uid()))))));
create policy enviar_msg_corrida on public.corrida_msgs as PERMISSIVE for INSERT to authenticated with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corrida_msgs.corrida_id) AND ((c.cliente_id = auth.uid()) OR (c.entregador_id = auth.uid())))))));
create policy enviar_pos on public.corrida_pos as PERMISSIVE for INSERT to authenticated with check (((entregador_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corrida_pos.corrida_id) AND (c.entregador_id = auth.uid()) AND (c.status = ANY (ARRAY['aceita'::text, 'coletada'::text])))))));
create policy mudar_pos on public.corrida_pos as PERMISSIVE for UPDATE to authenticated using ((entregador_id = auth.uid())) with check (((entregador_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corrida_pos.corrida_id) AND (c.entregador_id = auth.uid()) AND (c.status = ANY (ARRAY['aceita'::text, 'coletada'::text])))))));
create policy ver_pos on public.corrida_pos as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corrida_pos.corrida_id) AND (c.status = ANY (ARRAY['aceita'::text, 'coletada'::text])) AND ((c.cliente_id = auth.uid()) OR (c.entregador_id = auth.uid()))))));
create policy pedir_corrida on public.corridas as PERMISSIVE for INSERT to authenticated with check ((cliente_id = auth.uid()));
create policy ver_corridas on public.corridas as PERMISSIVE for SELECT to authenticated using (((status = 'aberta'::text) OR (cliente_id = auth.uid()) OR (entregador_id = auth.uid()) OR eh_admin()));
create policy criar_det on public.corridas_det as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corridas_det.corrida_id) AND (c.cliente_id = auth.uid()) AND (c.status = 'aberta'::text)))));
create policy ver_det on public.corridas_det as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM corridas c
  WHERE ((c.id = corridas_det.corrida_id) AND ((c.cliente_id = auth.uid()) OR (c.entregador_id = auth.uid()))))));
create policy meus_dados_mudar on public.dados_pessoais as PERMISSIVE for UPDATE to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy meus_dados_ver on public.dados_pessoais as PERMISSIVE for SELECT to authenticated using (((user_id = auth.uid()) OR eh_admin()));
create policy meus_dados_criar on public.dados_pessoais as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));
create policy ver_denuncias on public.denuncias as PERMISSIVE for SELECT to authenticated using (((user_id = auth.uid()) OR eh_admin()));
create policy denunciar on public.denuncias as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));
create policy dono_despesas on public.despesas as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy meu_disponivel on public.disponiveis as PERMISSIVE for ALL to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy ver_disponiveis on public.disponiveis as PERMISSIVE for SELECT to authenticated using (true);
create policy ver_encomendas on public.encomendas as PERMISSIVE for SELECT to authenticated using (((cliente_id = auth.uid()) OR (loja_id = auth.uid())));
create policy erro_gravar on public.erros_app as PERMISSIVE for INSERT to anon, authenticated with check ((NOT (user_id IS DISTINCT FROM auth.uid())));
create policy erro_apagar on public.erros_app as PERMISSIVE for DELETE to authenticated using (eh_admin());
create policy erro_ver on public.erros_app as PERMISSIVE for SELECT to authenticated using (eh_admin());
create policy dono_gastos_fac on public.gastos_fac as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy ver_relatos on public.infracoes as PERMISSIVE for SELECT to authenticated using (((alvo_id = auth.uid()) OR (autor_id = auth.uid()) OR eh_admin()));
create policy relatar on public.infracoes as PERMISSIVE for INSERT to authenticated with check ((autor_id = auth.uid()));
create policy moderar_mensagem on public.mensagens as PERMISSIVE for UPDATE to authenticated using (eh_admin()) with check (eh_admin());
create policy ler_mensagens on public.mensagens as PERMISSIVE for SELECT to authenticated using (((created_at > (now() - '24:00:00'::interval)) AND ((NOT oculta) OR (user_id = auth.uid()) OR eh_admin())));
create policy apagar_mensagem on public.mensagens as PERMISSIVE for DELETE to authenticated using (((user_id = auth.uid()) OR eh_admin()));
create policy enviar_mensagem on public.mensagens as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));
create policy ver_pagamento on public.pagamentos as PERMISSIVE for SELECT to authenticated using (((cliente_id = auth.uid()) OR (entregador_id = auth.uid()) OR eh_admin()));
create policy dono_perfil on public.perfis as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy ver_produtos on public.produtos as PERMISSIVE for SELECT to authenticated using ((ativo OR (loja_id = auth.uid())));
create policy meus_produtos on public.produtos as PERMISSIVE for ALL to authenticated using ((loja_id = auth.uid())) with check ((loja_id = auth.uid()));
create policy "promotor vê as lojas que cadastrou" on public.promotor_lojas as PERMISSIVE for SELECT to public using ((promotor_id = auth.uid()));
create policy "promotor vê os próprios saques" on public.promotor_saques as PERMISSIVE for SELECT to public using ((promotor_id = auth.uid()));
create policy dono_tarefas on public.tarefas as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy dono_turnos on public.turnos as PERMISSIVE for ALL to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy adm_veiculos on public.veiculos as PERMISSIVE for SELECT to authenticated using (eh_admin());
create policy meu_veiculo on public.veiculos as PERMISSIVE for ALL to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));

-- ============================================================
-- 8. Permissões de tabela
-- ============================================================

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.agenda to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.agenda to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.cofre to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.cofre to authenticated;
grant REFERENCES, SELECT, TRIGGER, TRUNCATE on public.corrida_codigos to anon;
grant REFERENCES, SELECT, TRIGGER, TRUNCATE on public.corrida_codigos to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corrida_msgs to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corrida_msgs to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corrida_pos to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corrida_pos to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corridas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corridas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corridas_det to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.corridas_det to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.dados_pessoais to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.dados_pessoais to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.denuncias to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.denuncias to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.despesas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.despesas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.disponiveis to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.disponiveis to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.encomendas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.encomendas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.erros_app to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.erros_app to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.gastos_fac to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.gastos_fac to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.infracoes to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.infracoes to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.mensagens to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.mensagens to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.mp_contas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.mp_contas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.pagamentos to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.pagamentos to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.perfis to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.perfis to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.produtos to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.produtos to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.promotor_lojas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.promotor_lojas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.promotor_saques to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.promotor_saques to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.push_cfg to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.push_cfg to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.push_msgs to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.push_msgs to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.push_subs to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.push_subs to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tarefas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tarefas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.turnos to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.turnos to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.veiculos to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.veiculos to authenticated;
