// ── Tipos ─────────────────────────────────────────────────────────────────

export type ProspectStatus = 'novo' | 'contatado' | 'visita_agendada' | 'convertido' | 'descartado'

export type Prospect = {
  id: string
  place_id: string
  name: string
  type: string | null
  cuisine: string | null
  visit_window: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  phone: string | null
  website: string | null
  instagram_google: string | null
  instagram_confirmed: string | null
  names_identified: string | null
  role_identified: string | null
  personal_handle: string | null
  rating: number | null
  review_count: number | null
  territory: string | null
  status: ProspectStatus
  notes: string | null
  extracted_at: string
  created_at: string
}

// ── Culinária ──────────────────────────────────────────────────────────────

export type CuisineEntry = { label: string; keywords: string[] }

export const CUISINE_MAP: CuisineEntry[] = [
  { label: 'Brasileiro',         keywords: ['churrascaria','boteco','botequim','carne','porcão','espeto','espetão','comida caseira','self service','self-service','kilo','quilo','buffet'] },
  { label: 'Nordestino',         keywords: ['nordestino','cearense','baiano','pernambucano','carne de sol','tapioca','forró','acarajé','moqueca','vatapá'] },
  { label: 'Italiano',           keywords: ['pizzaria','pizza','cantina','trattoria','massas','pasta','italiano','osteria','ristorante'] },
  { label: 'Japonês',            keywords: ['sushi','temakeria','temaki','japonês','japanese','ramen','izakaya','yakissoba','teppan','udon','sashimi','nikkei'] },
  { label: 'Árabe',              keywords: ['árabe','arabe','shawarma','kebab','libanês','libanes','sírio','sirio','hummus','esfiha','esfira','kibe'] },
  { label: 'Mexicano',           keywords: ['mexicano','tacos','taco','burrito','mexican','tex-mex','nachos','quesadilla'] },
  { label: 'Hamburguer',         keywords: ['burger','hamburguer','hamburgueria','smash','burguer','lanchonete gourmet'] },
  { label: 'Frutos do Mar',      keywords: ['frutos do mar','ostras','mariscos','pescados','peixaria','camarão','lagosta','marisco','osteria','peixe'] },
  { label: 'Chinês',             keywords: ['chinês','chines','chinese','dim sum','china'] },
  { label: 'Peruano',            keywords: ['peruano','ceviche','peruvian','cevicheria'] },
  { label: 'Bistrô / Francês',   keywords: ['bistrô','bistro','francês','frances','brasserie','boulangerie'] },
  { label: 'Contemporâneo',      keywords: ['contemporâneo','contemporaneo','gastronômico','gastronomico','gastronomia','fusion','moderno','alta gastronomia'] },
  { label: 'Vegano/Vegetariano', keywords: ['vegano','vegetariano','vegan','natural','orgânico','organico','macrobiôtico'] },
  { label: 'Grego',              keywords: ['grego','greek','gyros','souvlaki'] },
  { label: 'Espanhol',           keywords: ['espanhol','tapas','paella','spanish'] },
  { label: 'Tailandês',          keywords: ['tailandês','tailandes','thai','pad thai'] },
  { label: 'Indiano',            keywords: ['indiano','indian','curry','masala','tandoori'] },
]

export function detectCuisine(name: string): string | null {
  const nl = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const { label, keywords } of CUISINE_MAP) {
    for (const kw of keywords) {
      const kwn = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      if (nl.includes(kwn)) return label
    }
  }
  return null
}

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  novo:             'Novo',
  contatado:        'Contatado',
  visita_agendada:  'Visita Agendada',
  convertido:       'Convertido',
  descartado:       'Descartado',
}

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, string> = {
  novo:             'bg-sky-500/20 text-sky-400 border-sky-500/30',
  contatado:        'bg-amber-500/20 text-amber-400 border-amber-500/30',
  visita_agendada:  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  convertido:       'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  descartado:       'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

// ── Territórios ────────────────────────────────────────────────────────────

// lat/lng embutido — elimina dependência da Geocoding API
export type TerritorySearch = { neighborhood: string; city: string; lat: number; lng: number }

export type Territory = {
  label: string
  searches: TerritorySearch[]
}

const SP = 'São Paulo'

// Coordenadas centrais aproximadas de cada bairro/cidade
const COORDS: Record<string, [number, number]> = {
  // SP Capital — Centro
  'Sé':              [-23.5505, -46.6333],
  'República':       [-23.5430, -46.6390],
  'Bela Vista':      [-23.5590, -46.6430],
  'Liberdade':       [-23.5615, -46.6378],
  'Consolação':      [-23.5527, -46.6583],
  'Santa Cecília':   [-23.5440, -46.6500],
  'Bom Retiro':      [-23.5297, -46.6389],
  'Brás':            [-23.5441, -46.6200],
  'Cambuci':         [-23.5701, -46.6219],
  'Aclimação':       [-23.5669, -46.6325],
  // SP Capital — Zona Oeste
  'Pinheiros':       [-23.5629, -46.6866],
  'Vila Madalena':   [-23.5549, -46.6901],
  'Perdizes':        [-23.5358, -46.6698],
  'Pompéia':         [-23.5340, -46.6771],
  'Lapa':            [-23.5218, -46.7015],
  'Alto de Pinheiros':[-23.5473,-46.7198],
  'Itaim Bibi':      [-23.5879, -46.6757],
  'Morumbi':         [-23.6120, -46.7133],
  'Butantã':         [-23.5716, -46.7271],
  'Alto da Lapa':    [-23.5268, -46.7245],
  'Vila Leopoldina': [-23.5172, -46.7320],
  'Barra Funda':     [-23.5260, -46.6648],
  // SP Capital — Jardins / Centro-Oeste
  'Jardins':         [-23.5655, -46.6623],
  'Cerqueira César': [-23.5590, -46.6634],
  'Higienópolis':    [-23.5382, -46.6582],
  'Pacaembu':        [-23.5437, -46.6717],
  'Vila Buarque':    [-23.5415, -46.6478],
  'Bixiga':          [-23.5596, -46.6399],
  'Paraíso':         [-23.5768, -46.6391],
  'Vila Nova Conceição':[-23.5957,-46.6706],
  // SP Capital — Zona Sul
  'Moema':           [-23.5994, -46.6629],
  'Vila Mariana':    [-23.5887, -46.6353],
  'Brooklin':        [-23.6248, -46.6943],
  'Campo Belo':      [-23.6195, -46.6760],
  'Saúde':           [-23.6014, -46.6228],
  'Jabaquara':       [-23.6430, -46.6289],
  'Santo Amaro':     [-23.6514, -46.7117],
  'Granja Julieta':  [-23.6230, -46.7030],
  'Chácara Klabin':  [-23.5886, -46.6257],
  'Indianópolis':    [-23.5980, -46.6510],
  'Ipiranga':        [-23.5906, -46.6044],
  'Planalto Paulista':[-23.6054,-46.6401],
  // SP Capital — Zona Norte
  'Santana':         [-23.5004, -46.6267],
  'Vila Guilherme':  [-23.5100, -46.6090],
  'Tucuruvi':        [-23.4798, -46.6111],
  'Casa Verde':      [-23.5059, -46.6553],
  'Cachoeirinha':    [-23.4906, -46.6419],
  'Mandaqui':        [-23.4889, -46.6207],
  'Tremembé':        [-23.4603, -46.6267],
  'Parada Inglesa':  [-23.4762, -46.6121],
  'Lauzane Paulista':[-23.4885, -46.6352],
  // SP Capital — Zona Leste
  'Tatuapé':         [-23.5430, -46.5783],
  'Mooca':           [-23.5529, -46.6015],
  'Penha':           [-23.5219, -46.5452],
  'Vila Prudente':   [-23.5879, -46.5834],
  'Carrão':          [-23.5424, -46.5580],
  'Belenzinho':      [-23.5430, -46.5949],
  'Anália Franco':   [-23.5401, -46.5552],
  'Vila Formosa':    [-23.5424, -46.5473],
  'Água Rasa':       [-23.5538, -46.5779],
  'Aricanduva':      [-23.5521, -46.5297],
  // Grande SP
  'Guarulhos':           [-23.4538, -46.5333],
  'Santo André':         [-23.6624, -46.5382],
  'São Bernardo do Campo':[-23.6914,-46.5646],
  'São Caetano do Sul':  [-23.6231, -46.5742],
  'Osasco':              [-23.5324, -46.7919],
  'Barueri':             [-23.5111, -46.8762],
  'Santana de Parnaíba': [-23.4437, -46.9186],
  'Diadema':             [-23.6861, -46.6212],
  'Mauá':                [-23.6678, -46.4611],
  'Ribeirão Pires':      [-23.7119, -46.4153],
  'Carapicuíba':         [-23.5230, -46.8354],
  'Cotia':               [-23.6039, -46.9196],
  'Embu das Artes':      [-23.6494, -46.8519],
  'Taboão da Serra':     [-23.6033, -46.7753],
  // Litoral
  'Santos':          [-23.9608, -46.3336],
  'Guarujá':         [-23.9929, -46.2566],
  'São Vicente':     [-23.9582, -46.3922],
  'Praia Grande':    [-24.0059, -46.4022],
  'Bertioga':        [-23.8553, -46.1386],
  'Ubatuba':         [-23.4337, -45.0838],
  'Caraguatatuba':   [-23.6208, -45.4126],
  'São Sebastião':   [-23.7996, -45.4110],
  'Ilhabela':        [-23.7774, -45.3578],
  'Peruíbe':         [-24.3195, -47.0066],
  'Itanhaém':        [-24.1844, -46.7851],
}

function toSearch(name: string, city: string): TerritorySearch {
  const key  = name || city
  const [lat, lng] = COORDS[key] ?? [-23.5505, -46.6333]
  return { neighborhood: name, city, lat, lng }
}

export const TERRITORIES: Territory[] = [
  {
    label: 'SP Capital — Completo (todas as zonas)',
    searches: [
      'Sé','República','Bela Vista','Liberdade','Consolação','Santa Cecília','Bom Retiro','Brás','Cambuci','Aclimação',
      'Pinheiros','Vila Madalena','Perdizes','Pompéia','Lapa','Alto de Pinheiros','Itaim Bibi','Morumbi','Butantã','Alto da Lapa','Vila Leopoldina','Barra Funda',
      'Jardins','Cerqueira César','Higienópolis','Pacaembu','Vila Buarque','Bixiga',
      'Moema','Vila Mariana','Brooklin','Campo Belo','Saúde','Jabaquara','Santo Amaro','Granja Julieta','Chácara Klabin','Indianópolis','Ipiranga',
      'Santana','Vila Guilherme','Tucuruvi','Casa Verde','Cachoeirinha','Mandaqui','Tremembé','Parada Inglesa',
      'Tatuapé','Mooca','Penha','Vila Prudente','Carrão','Belenzinho','Anália Franco','Vila Formosa','Água Rasa',
    ].map(n => toSearch(n, SP)),
  },
  {
    label: 'SP Capital — Centro',
    searches: ['Sé','República','Bela Vista','Liberdade','Consolação','Santa Cecília','Bom Retiro','Brás','Cambuci','Aclimação'].map(n => toSearch(n, SP)),
  },
  {
    label: 'SP Capital — Zona Oeste',
    searches: ['Pinheiros','Vila Madalena','Perdizes','Pompéia','Lapa','Alto de Pinheiros','Itaim Bibi','Morumbi','Butantã','Alto da Lapa','Vila Leopoldina','Barra Funda'].map(n => toSearch(n, SP)),
  },
  {
    label: 'SP Capital — Jardins e Centro-Oeste',
    searches: ['Jardins','Cerqueira César','Higienópolis','Pacaembu','Vila Buarque','Bixiga','Paraíso','Vila Nova Conceição'].map(n => toSearch(n, SP)),
  },
  {
    label: 'SP Capital — Zona Sul',
    searches: ['Moema','Vila Mariana','Brooklin','Campo Belo','Saúde','Jabaquara','Santo Amaro','Granja Julieta','Chácara Klabin','Indianópolis','Ipiranga','Planalto Paulista'].map(n => toSearch(n, SP)),
  },
  {
    label: 'SP Capital — Zona Norte',
    searches: ['Santana','Vila Guilherme','Tucuruvi','Casa Verde','Cachoeirinha','Mandaqui','Tremembé','Parada Inglesa','Lauzane Paulista'].map(n => toSearch(n, SP)),
  },
  {
    label: 'SP Capital — Zona Leste',
    searches: ['Tatuapé','Mooca','Penha','Vila Prudente','Carrão','Belenzinho','Anália Franco','Vila Formosa','Água Rasa','Aricanduva'].map(n => toSearch(n, SP)),
  },
  {
    label: 'Grande São Paulo',
    searches: ['Guarulhos','Santo André','São Bernardo do Campo','São Caetano do Sul','Osasco','Barueri','Santana de Parnaíba','Diadema','Mauá','Ribeirão Pires','Carapicuíba','Cotia','Embu das Artes','Taboão da Serra'].map(c => toSearch('', c)),
  },
  {
    label: 'Litoral Paulista',
    searches: ['Santos','Guarujá','São Vicente','Praia Grande','Bertioga','Ubatuba','Caraguatatuba','São Sebastião','Ilhabela','Peruíbe','Itanhaém'].map(c => toSearch('', c)),
  },
]

// ── Tipos de busca ─────────────────────────────────────────────────────────

export type SearchType = {
  label: string
  query: string
  defaultChecked: boolean
}

export const SEARCH_TYPES: SearchType[] = [
  { label: 'Bares e Pubs',                        query: 'bar pub',                        defaultChecked: true  },
  { label: 'Cocktail Bars e Speakeasies',          query: 'cocktail bar speakeasy',          defaultChecked: true  },
  { label: 'Baladas e Casas Noturnas',             query: 'balada casa noturna nightclub',   defaultChecked: true  },
  { label: 'Restaurantes',                         query: 'restaurante',                     defaultChecked: true  },
  { label: 'Cervejarias e Brewpubs',               query: 'cervejaria brewpub',              defaultChecked: true  },
  { label: 'Empórios, Adegas e Lojas de Bebidas',  query: 'empório adega loja de bebidas',   defaultChecked: true  },
  { label: 'Distribuidoras de Bebidas',            query: 'distribuidora de bebidas',        defaultChecked: false },
  { label: 'Hotéis',                               query: 'hotel',                           defaultChecked: false },
]

// ── Filtro negativo ────────────────────────────────────────────────────────

export const NEGATIVE_KEYWORDS = [
  'lanchonete','padaria','padoca','panificadora',
  'farmácia','farmacia','drogaria',
  'supermercado','mercearia','hortifruti','sacolão',
  'pet shop','petshop','veterinário','veterinario',
  'salão','salao','barbearia','cabelereiro','manicure',
  'posto de gasolina','posto gasolina','combustível','combustivel',
  'clínica','clinica','consultório','consultorio','odontológica',
  'escola','colégio','colegio','faculdade','universidade','curso',
  'academia','fitness','pilates','crossfit',
  'autopeças','autopecas','autoescola','mecânica','mecanica',
  'lotérica','loterica','lavanderia','hospital','laboratório','laboratorio',
  'dentista','odontologia','imobiliária','imobiliaria','cartório','cartorio',
]
