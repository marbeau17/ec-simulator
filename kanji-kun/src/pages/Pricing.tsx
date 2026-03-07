import { PlanType } from '../types';
import './Pricing.css';

interface PricingProps {
  currentPlan: PlanType;
  onChangePlan: (plan: PlanType) => void;
}

interface PlanFeature {
  name: string;
  free: string;
  pro: string;
  business: string;
}

const FEATURES: PlanFeature[] = [
  { name: 'イベント作成', free: '月3件', pro: '無制限', business: '無制限' },
  { name: '参加者数', free: '10名まで', pro: '30名まで', business: '100名まで' },
  { name: '日程候補自動生成', free: '基本（祝日回避）', pro: 'スマート（繁忙期考慮）', business: 'フル（カスタムルール）' },
  { name: '投票リンク共有', free: '1リンク', pro: '複数リンク', business: '複数＋SSO連携' },
  { name: '自動リマインド', free: '✕', pro: 'メール通知', business: 'Slack / Teams連携' },
  { name: '場所提案', free: '駅名のみ', pro: '飲食店おすすめ', business: '法人契約店優先' },
  { name: 'AI最適日程提案', free: '✕', pro: '主役優先判定', business: '加重スコアリング' },
  { name: 'テンプレート', free: '基本3種', pro: '15種＋カスタム', business: '無制限' },
  { name: 'イベント履歴', free: '直近3件', pro: '1年分', business: '無制限＋分析' },
  { name: '幹事ガイド', free: '基本ステップ', pro: '詳細チェックリスト', business: '企業カスタマイズ' },
  { name: '広告非表示', free: '✕', pro: '○', business: '○' },
  { name: 'Googleカレンダー連携', free: '○', pro: '○', business: '○' },
  { name: 'サポート', free: 'FAQ', pro: 'メールサポート', business: '優先サポート' },
];

export function Pricing({ currentPlan, onChangePlan }: PricingProps) {
  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>料金プラン</h1>
        <p>あなたのチームに最適なプランを選びましょう</p>
      </div>

      <div className="pricing-cards">
        {/* Free */}
        <div className={`pricing-card ${currentPlan === 'free' ? 'current' : ''}`}>
          <div className="card-header free">
            <h2>Free</h2>
            <div className="price">
              <span className="amount">¥0</span>
              <span className="period">/月</span>
            </div>
            <p className="card-desc">個人の幹事に最適</p>
          </div>
          <ul className="card-features">
            <li>月3件までイベント作成</li>
            <li>最大10名の参加者</li>
            <li>基本的な日程候補生成</li>
            <li>投票リンク共有</li>
            <li>幹事ガイド（基本）</li>
            <li>Googleカレンダー連携</li>
          </ul>
          {currentPlan === 'free' ? (
            <div className="current-plan-label">現在のプラン</div>
          ) : (
            <button className="btn-plan free" onClick={() => onChangePlan('free')}>
              Freeに変更
            </button>
          )}
        </div>

        {/* Pro */}
        <div className={`pricing-card popular ${currentPlan === 'pro' ? 'current' : ''}`}>
          <div className="popular-badge">人気No.1</div>
          <div className="card-header pro">
            <h2>Pro</h2>
            <div className="price">
              <span className="amount">¥500</span>
              <span className="period">/月</span>
            </div>
            <p className="card-desc">頻繁に幹事をする方に</p>
          </div>
          <ul className="card-features">
            <li><strong>無制限</strong>のイベント作成</li>
            <li>最大<strong>30名</strong>の参加者</li>
            <li><strong>スマート</strong>日程候補生成</li>
            <li><strong>自動リマインド</strong>メール</li>
            <li><strong>AI最適日程</strong>提案</li>
            <li>飲食店おすすめ提案</li>
            <li>15種のテンプレート</li>
            <li>広告非表示</li>
            <li>メールサポート</li>
          </ul>
          {currentPlan === 'pro' ? (
            <div className="current-plan-label">現在のプラン</div>
          ) : (
            <button className="btn-plan pro" onClick={() => onChangePlan('pro')}>
              Proにアップグレード
            </button>
          )}
        </div>

        {/* Business */}
        <div className={`pricing-card ${currentPlan === 'business' ? 'current' : ''}`}>
          <div className="card-header business">
            <h2>Business</h2>
            <div className="price">
              <span className="amount">¥2,000</span>
              <span className="period">/月</span>
            </div>
            <p className="card-desc">企業の総務部門に</p>
          </div>
          <ul className="card-features">
            <li>Proの全機能 +</li>
            <li>最大<strong>100名</strong>の参加者</li>
            <li><strong>Slack / Teams</strong>連携</li>
            <li>法人契約店舗の優先表示</li>
            <li><strong>無制限</strong>テンプレート</li>
            <li>分析レポート</li>
            <li>企業カスタマイズ</li>
            <li><strong>優先サポート</strong></li>
            <li>年間契約で<strong>20%オフ</strong></li>
          </ul>
          {currentPlan === 'business' ? (
            <div className="current-plan-label">現在のプラン</div>
          ) : (
            <button className="btn-plan business" onClick={() => onChangePlan('business')}>
              Businessにアップグレード
            </button>
          )}
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="comparison-section">
        <h2>機能比較表</h2>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>機能</th>
                <th>Free</th>
                <th>Pro</th>
                <th>Business</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.name}>
                  <td className="feature-name">{f.name}</td>
                  <td>{f.free}</td>
                  <td className="pro-col">{f.pro}</td>
                  <td>{f.business}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional monetization */}
      <div className="additional-section">
        <h2>その他のサービス</h2>
        <div className="additional-cards">
          <div className="additional-card">
            <h3>🍽️ 飲食店アフィリエイト</h3>
            <p>
              場所提案から直接予約が可能。ホットペッパー・食べログ等と連携し、
              幹事に嬉しいポイント還元も。
            </p>
            <span className="additional-price">全プラン利用可能</span>
          </div>
          <div className="additional-card">
            <h3>📋 プレミアムテンプレート</h3>
            <p>
              歓迎会・送別会・忘年会など、目的別の詳細テンプレート。
              進行表・挨拶文例・席順案付き。
            </p>
            <span className="additional-price">¥100 / テンプレート</span>
          </div>
          <div className="additional-card">
            <h3>🏢 企業一括導入</h3>
            <p>
              Businessプランの年間契約で20%オフ。
              全社員のアカウントを一括管理。SSO対応。
            </p>
            <span className="additional-price">¥19,200 / 年（20%オフ）</span>
          </div>
        </div>
      </div>
    </div>
  );
}
