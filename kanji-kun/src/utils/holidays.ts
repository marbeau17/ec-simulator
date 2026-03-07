// 日本の祝日データ (2025-2027)
// 実際のアプリではAPIを使用しますが、プロトタイプではハードコード
const HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-02-24': '振替休日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-05-06': '振替休日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日',
  '2025-11-24': '振替休日',
  // 2026
  '2026-01-01': '元日',
  '2026-01-12': '成人の日',
  '2026-02-11': '建国記念の日',
  '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日',
  '2026-04-29': '昭和の日',
  '2026-05-03': '憲法記念日',
  '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日',
  '2026-05-06': '振替休日',
  '2026-07-20': '海の日',
  '2026-08-11': '山の日',
  '2026-09-21': '敬老の日',
  '2026-09-23': '秋分の日',
  '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',
  // 2027
  '2027-01-01': '元日',
  '2027-01-11': '成人の日',
  '2027-02-11': '建国記念の日',
  '2027-02-23': '天皇誕生日',
  '2027-03-21': '春分の日',
  '2027-03-22': '振替休日',
  '2027-04-29': '昭和の日',
  '2027-05-03': '憲法記念日',
  '2027-05-04': 'みどりの日',
  '2027-05-05': 'こどもの日',
  '2027-07-19': '海の日',
  '2027-08-11': '山の日',
  '2027-09-20': '敬老の日',
  '2027-09-23': '秋分の日',
  '2027-10-11': 'スポーツの日',
  '2027-11-03': '文化の日',
  '2027-11-23': '勤労感謝の日',
};

export function isHoliday(dateStr: string): boolean {
  return dateStr in HOLIDAYS;
}

export function getHolidayName(dateStr: string): string | undefined {
  return HOLIDAYS[dateStr];
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isBusinessDay(date: Date): boolean {
  const dateStr = formatDate(date);
  return !isWeekend(date) && !isHoliday(dateStr);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 忘年会・新年会シーズン判定（12月、1月）
export function isBusySeason(date: Date): boolean {
  const month = date.getMonth();
  return month === 11 || month === 0; // December or January
}

// 金曜日の前の夜（木曜日）や祝前日は飲食店が混雑
export function isRestaurantBusyDay(date: Date): boolean {
  const dateStr = formatDate(date);
  const day = date.getDay();

  // 金曜日
  if (day === 5) return true;

  // 祝前日チェック
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDateStr = formatDate(nextDay);
  if (isHoliday(nextDateStr) || nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    return true;
  }

  return isBusySeason(date);
}

interface DateCandidateOptions {
  startDate: Date;
  participantCount: number;
  avoidBusySeason: boolean; // Pro以上
  leadTimeDays: number;     // 回答リードタイム
}

export function generateDateCandidates(options: DateCandidateOptions): string[] {
  const { startDate, participantCount, avoidBusySeason, leadTimeDays } = options;
  const candidates: string[] = [];

  // 参加人数に応じた候補日数を決定
  let targetCount: number;
  if (participantCount <= 10) {
    targetCount = 7; // 5-10日
  } else if (participantCount <= 12) {
    targetCount = 12; // 10-15日
  } else {
    targetCount = 15;
  }

  // リードタイム + 予約余裕を考慮した開始日
  const searchStart = new Date(startDate);
  searchStart.setDate(searchStart.getDate() + leadTimeDays);

  // 繁忙期の場合はさらに余裕をもたせる
  if (isBusySeason(searchStart) && avoidBusySeason) {
    searchStart.setDate(searchStart.getDate() + 14); // 2週間追加
  }

  const maxDaysToSearch = 60; // 最大60日先まで検索
  let daysSearched = 0;

  const current = new Date(searchStart);
  while (candidates.length < targetCount && daysSearched < maxDaysToSearch) {
    if (isBusinessDay(current)) {
      if (!avoidBusySeason || !isRestaurantBusyDay(current)) {
        candidates.push(formatDate(current));
      } else {
        // 繁忙期でも候補が少なすぎる場合は追加
        if (candidates.length < targetCount / 2) {
          candidates.push(formatDate(current));
        }
      }
    }
    current.setDate(current.getDate() + 1);
    daysSearched++;
  }

  return candidates;
}

export function formatDateJa(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${month}/${day}（${dayOfWeek}）`;
}
