import { DateCandidate, Participant } from '../types';

interface DateScore {
  date: string;
  startTime: string;
  score: number;
  okCount: number;
  maybeCount: number;
  ngCount: number;
  mainPersonAvailable: boolean;
}

export function recommendBestDate(
  candidates: DateCandidate[],
  participants: Participant[]
): DateScore[] {
  const mainPersonIds = participants
    .filter((p) => p.isMainPerson)
    .map((p) => p.id);

  const scores: DateScore[] = candidates.map((candidate) => {
    let okCount = 0;
    let maybeCount = 0;
    let ngCount = 0;
    let mainPersonAvailable = true;

    candidate.votes.forEach((vote) => {
      switch (vote.status) {
        case 'ok':
          okCount++;
          break;
        case 'maybe':
          maybeCount++;
          break;
        case 'ng':
          ngCount++;
          if (mainPersonIds.includes(vote.participantId)) {
            mainPersonAvailable = false;
          }
          break;
      }
    });

    // スコア計算: 主役優先
    let score = 0;
    score += okCount * 3;
    score += maybeCount * 1;
    score -= ngCount * 2;

    // 主役がNGなら大幅減点
    if (!mainPersonAvailable) {
      score -= 100;
    }

    // 主役がOKならボーナス
    const mainPersonOk = candidate.votes.some(
      (v) => mainPersonIds.includes(v.participantId) && v.status === 'ok'
    );
    if (mainPersonOk) {
      score += 10;
    }

    return {
      date: candidate.date,
      startTime: candidate.startTime,
      score,
      okCount,
      maybeCount,
      ngCount,
      mainPersonAvailable,
    };
  });

  return scores.sort((a, b) => b.score - a.score);
}
