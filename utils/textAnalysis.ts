export interface KeywordFrequency {
  word: string
  count: number
  pct: number
}

export interface TextAnalysis {
  totalTexts: number
  avgLength: number
  sentimentLabel: 'Positif' | 'Neutre' | 'Négatif'
  sentimentScore: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  topKeywords: KeywordFrequency[]
  positiveWords: string[]
  negativeWords: string[]
}

function norm(w: string): string {
  return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const STOP = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'au', 'aux',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'ce', 'cet',
  'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'nos', 'vos', 'leurs',
  'que', 'qui', 'quoi', 'dont', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'est', 'sont', 'etre', 'avoir', 'tres', 'plus', 'tout', 'aussi', 'avec',
  'pour', 'sur', 'par', 'dans', 'pas', 'ne', 'non', 'oui', 'si', 'meme',
  'encore', 'toujours', 'jamais', 'puis', 'apres', 'avant', 'pendant', 'depuis',
  'contre', 'entre', 'sans', 'sous', 'vers', 'chez', 'me', 'se', 'lui', 'eux',
  'y', 'quand', 'comment', 'pourquoi', 'quel', 'quelle', 'quels', 'quelles',
  'lors', 'hors', 'cela', 'ca', 'ete', 'fait', 'a', 'j', 'l', 'm', 'n',
  's', 't', 'd', 'qu', 'c', 'ont', 'era', 'ser', 'etc', 'cest', 'moi',
  'toi', 'soi', 'ceci', 'cela', 'celui', 'celle', 'ceux', 'celles'
])

const POS = new Set([
  'bien', 'bon', 'bonne', 'excellent', 'excellente', 'super', 'parfait', 'parfaite',
  'genial', 'geniale', 'formidable', 'agreable', 'satisfait', 'satisfaite',
  'content', 'contente', 'heureux', 'heureuse', 'positif', 'positive', 'utile',
  'efficace', 'rapide', 'clair', 'claire', 'facile', 'sympathique', 'professionnel',
  'professionnelle', 'qualite', 'amelioration', 'progression', 'bravo', 'merci',
  'apprecie', 'appreciee', 'interessant', 'interessante', 'motivant', 'motivante',
  'encourageant', 'encourageante', 'enrichissant', 'enrichissante', 'adapte',
  'adaptee', 'innovant', 'innovante', 'dynamique', 'simple', 'benefique',
  'reussi', 'reussie', 'productif', 'productive', 'recommande', 'recommandee',
  'satisfaisant', 'satisfaisante', 'top', 'convenable', 'favorable', 'pertinent',
  'pertinente', 'coherent', 'coherente', 'clair', 'concis', 'beau', 'belle',
  'parfaitement', 'excellent', 'super', 'genial', 'formidable', 'ideal', 'ideale',
  'precis', 'precise', 'complet', 'complete', 'structure', 'structuree',
  'accessible', 'pratique', 'concret', 'concrete', 'moderne', 'fiable',
  'transparence', 'confiance', 'respect', 'ecoute', 'soutien', 'aide', 'appui'
])

const NEG = new Set([
  'mauvais', 'mauvaise', 'probleme', 'difficile', 'difficulte', 'difficultes',
  'complique', 'compliquee', 'manque', 'insuffisant', 'insuffisante', 'lent',
  'lente', 'ennuyeux', 'ennuyeuse', 'decu', 'decue', 'decevant', 'decevante',
  'mediocre', 'insatisfait', 'insatisfaite', 'frustrant', 'frustrante', 'inadapte',
  'inadaptee', 'inutile', 'desorganise', 'desorganisee', 'confus', 'confuse',
  'inefficace', 'penible', 'critique', 'negatif', 'negative', 'absurde',
  'maladroit', 'maladroite', 'catastrophique', 'terrible', 'nul', 'nulle',
  'horrible', 'affreux', 'affreuse', 'pitoyable', 'lamentable', 'defaillance',
  'defaut', 'lacune', 'incoherent', 'incoherente', 'faible', 'repetitif',
  'repetitive', 'superficiel', 'superficielle', 'depasse', 'depassee', 'obsolete',
  'impossible', 'rejet', 'ennui', 'stress', 'stressant', 'stressante', 'lourd',
  'lourde', 'flou', 'floue', 'vague', 'ambigu', 'ambigue', 'trop', 'peu',
  'jamais', 'aucun', 'aucune', 'manquant', 'manquante', 'absent', 'absente',
  'retard', 'retards', 'blocage', 'obstacle', 'contrainte', 'pression',
  'surcharge', 'confusion', 'incomprehension', 'incomplet', 'incomplete'
])

function tokenize(text: string): string[] {
  return norm(text)
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
}

function scoreSentiment(text: string): -1 | 0 | 1 {
  const words = norm(text).replace(/[^a-z\s]/g, ' ').split(/\s+/)
  let pos = 0, neg = 0
  for (const w of words) {
    if (POS.has(w)) pos++
    if (NEG.has(w)) neg++
  }
  if (pos > neg) return 1
  if (neg > pos) return -1
  return 0
}

export function analyzeTexts(texts: string[]): TextAnalysis {
  if (!texts.length) {
    return {
      totalTexts: 0, avgLength: 0, sentimentLabel: 'Neutre', sentimentScore: 0,
      positiveCount: 0, negativeCount: 0, neutralCount: 0,
      topKeywords: [], positiveWords: [], negativeWords: []
    }
  }

  const avgLength = Math.round(
    texts.reduce((s, t) => s + t.split(/\s+/).filter(Boolean).length, 0) / texts.length
  )

  let positiveCount = 0, negativeCount = 0, neutralCount = 0
  for (const t of texts) {
    const s = scoreSentiment(t)
    if (s === 1) positiveCount++
    else if (s === -1) negativeCount++
    else neutralCount++
  }

  const sentimentScore = (positiveCount - negativeCount) / texts.length
  const sentimentLabel: 'Positif' | 'Neutre' | 'Négatif' =
    sentimentScore > 0.1 ? 'Positif' : sentimentScore < -0.1 ? 'Négatif' : 'Neutre'

  // Document frequency: how many distinct texts contain each word
  const docFreq: Record<string, number> = {}
  for (const t of texts) {
    const words = new Set(tokenize(t))
    for (const w of words) {
      docFreq[w] = (docFreq[w] ?? 0) + 1
    }
  }

  const topKeywords: KeywordFrequency[] = Object.entries(docFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({
      word,
      count,
      pct: Math.round((count / texts.length) * 100)
    }))

  const allWords = new Set(Object.keys(docFreq))
  const positiveWords = [...allWords].filter(w => POS.has(w)).slice(0, 8)
  const negativeWords = [...allWords].filter(w => NEG.has(w)).slice(0, 8)

  return {
    totalTexts: texts.length, avgLength, sentimentLabel, sentimentScore,
    positiveCount, negativeCount, neutralCount,
    topKeywords, positiveWords, negativeWords
  }
}
