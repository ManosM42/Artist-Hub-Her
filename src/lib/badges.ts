export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  min: number;
  max: number | null;
}

export const badges: Badge[] = [
  {
    id: 'newcomer',
    name: 'Newcomer',
    emoji: '🎟️',
    description: 'Μόλις ξεκίνησες το ταξίδι σου',
    color: '#6b7280',
    min: 0,
    max: 0,
  },
  {
    id: 'fan',
    name: 'Fan',
    emoji: '🎵',
    description: '1-3 συναυλίες',
    color: '#3b82f6',
    min: 1,
    max: 3,
  },
  {
    id: 'devoted',
    name: 'Devoted',
    emoji: '🔥',
    description: '4-7 συναυλίες',
    color: '#a855f7',
    min: 4,
    max: 7,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    emoji: '⚡',
    description: '8-10 συναυλίες',
    color: '#f59e0b',
    min: 8,
    max: 10,
  },
  {
    id: 'legend',
    name: 'Legend',
    emoji: '👑',
    description: '10+ συναυλίες',
    color: '#ec4899',
    min: 11,
    max: null,
  },
]

export const getBadge = (concerts: number): Badge => {
  return badges.find(b => 
    concerts >= b.min && (b.max === null || concerts <= b.max)
  ) ?? badges[0]
}