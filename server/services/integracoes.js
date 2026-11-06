/**
 * Registro de integrações — a "tomada" modular do sistema.
 *
 * Cada integração futura (geração de vídeo, narração, edição, publicação,
 * monetização) é declarada aqui com seu estado real. Nenhuma está conectada
 * nesta etapa. Este módulo é o único ponto que precisa ser alterado quando
 * uma integração for implementada.
 */
'use strict';

const integracoes = [
  {
    id: 'geracao-video',
    nome: 'Geração de vídeos por IA',
    agente: 'a4',
    descricao: 'Criação de cenas e clipes visuais por inteligência artificial.',
    estado: 'indisponivel',
    motivo: 'Geração de vídeo por IA não está disponível nesta conta.',
    custo: 'Plano pago (Basic em diante) ou chave de provedor própria.',
    custoEhPago: true,
    alternativaGratuita: 'Storyboard + prompts visuais + uso de banco de imagens próprio ou de licença livre.',
  },
  {
    id: 'narracao',
    nome: 'Narração por voz sintética',
    agente: 'a4',
    descricao: 'Transformação do roteiro em áudio narrado.',
    estado: 'indisponivel',
    motivo: 'Geração de voz/áudio por IA não está disponível nesta conta.',
    custo: 'Plano pago ou chave de provedor própria.',
    custoEhPago: true,
    alternativaGratuita: 'Narração humana gravada ou uso de voz de licença livre.',
  },
  {
    id: 'edicao',
    nome: 'Edição audiovisual',
    agente: 'a5',
    descricao: 'Corte, legendas queimadas, capa e exportação 9:16.',
    estado: 'pronto_para_integrar',
    motivo: 'Ferramentas de linha de comando locais podem ser integradas sem custo.',
    custo: 'Gratuito (processamento local).',
    custoEhPago: false,
    alternativaGratuita: null,
  },
  {
    id: 'publicacao',
    nome: 'Publicação nas redes',
    agente: 'a6',
    descricao: 'Envio de vídeos para YouTube Shorts, Instagram Reels e TikTok.',
    estado: 'pendente',
    motivo: 'Exige conexão de contas e autorização explícita de publicação.',
    custo: 'Depende de cada plataforma; nenhuma conta será conectada sem autorização.',
    custoEhPago: false,
    alternativaGratuita: 'Publicação assistida: o painel organiza a fila e você publica manualmente.',
  },
  {
    id: 'monetizacao',
    nome: 'Análise de monetização',
    agente: 'a2',
    descricao: 'Receita estimada por canal e por conteúdo.',
    estado: 'pendente',
    motivo: 'Depende de dados reais das plataformas, ainda não conectadas.',
    custo: 'Gratuito para leitura de dados; APIs de terceiros podem ter custo.',
    custoEhPago: false,
    alternativaGratuita: 'Registro manual de receita no painel.',
  },
  {
    id: 'armazenamento',
    nome: 'Armazenamento em nuvem',
    agencia: 'painel',
    descricao: 'Biblioteca de vídeos e roteiros fora desta máquina.',
    estado: 'pendente',
    motivo: 'Etapa 1 opera com armazenamento local em disco.',
    custo: 'Depende do provedor escolhido.',
    custoEhPago: false,
    alternativaGratuita: 'Armazenamento local atual.',
  },
  {
    id: 'nuvem-24h',
    nome: 'Operação 24/7 sem computador ligado',
    descricao: 'Agentes e rotinas rodando na nuvem.',
    estado: 'pendente',
    motivo: 'Hoje tudo roda nesta máquina, enquanto ela estiver ligada e o app aberto.',
    custo: 'Plano pago (Basic em diante).',
    custoEhPago: true,
    alternativaGratuita: 'Operação local enquanto o computador estiver ligado.',
  },
];

module.exports = { integracoes };
