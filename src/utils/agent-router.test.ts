import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  routeIncomingMessageToAgent, 
  getAgentRoadmapStats, 
  createWhatsAppClickUrl,
  createTelegramClickUrl 
} from './agent-router';
import type { AgentProfile } from '../types/index';

const mockAgents: AgentProfile[] = [
  {
    id: 'fin-01',
    name: 'FinOS Agent',
    nameEn: 'Financial Agent',
    role: 'Financial Operations',
    roleEn: 'Finance',
    description: 'Finance Specialist',
    status: 'active',
    avatar: '💼',
    isSpecialist: true,
    specialty: 'finance',
    phase: 'المرحلة 1 (الحالية)',
    capabilities: ['expenses', 'budget'],
    triggerKeywords: ['finance'],
    metrics: { tasksCompleted: 10, uptime: '100%', memoryMb: 100, tokensUsed: 1000, avgLatencyMs: 15 },
  },
  {
    id: 'mkt-02',
    name: 'MarketOS Agent',
    nameEn: 'Marketing Agent',
    role: 'Marketing Campaigns',
    roleEn: 'Marketing',
    description: 'Upcoming Marketing Agent',
    status: 'planned',
    avatar: '📢',
    isSpecialist: true,
    specialty: 'marketing',
    phase: 'المرحلة 2 (المستقبلية)',
    capabilities: ['campaigns', 'roas'],
    triggerKeywords: ['marketing'],
    metrics: { tasksCompleted: 0, uptime: '0%', memoryMb: 0, tokensUsed: 0, avgLatencyMs: 0 },
  },
  {
    id: 'sales-03',
    name: 'SalesOS Agent',
    nameEn: 'Sales Agent',
    role: 'Deals & Pipeline',
    roleEn: 'Sales',
    description: 'Upcoming Sales Agent',
    status: 'planned',
    avatar: '🎯',
    isSpecialist: true,
    specialty: 'sales',
    phase: 'المرحلة 2 (المستقبلية)',
    capabilities: ['crm', 'deals'],
    triggerKeywords: ['sales'],
    metrics: { tasksCompleted: 0, uptime: '0%', memoryMb: 0, tokensUsed: 0, avgLatencyMs: 0 },
  },
];

test('routeIncomingMessageToAgent dispatches finance expenses to active FinOS', () => {
  const result = routeIncomingMessageToAgent('سجلت مصروف 150 ريال غداء عمل', mockAgents);
  assert.equal(result.targetAgentId, 'fin-01');
  assert.equal(result.specialty, 'finance');
  assert.equal(result.isTargetActive, true);
});

test('routeIncomingMessageToAgent identifies marketing queries and flags staged status', () => {
  const result = routeIncomingMessageToAgent('أريد تحسين أداء حملة التسويق على سناب شات', mockAgents);
  assert.equal(result.targetAgentId, 'mkt-02');
  assert.equal(result.specialty, 'marketing');
  assert.equal(result.isTargetActive, false);
});

test('routeIncomingMessageToAgent identifies sales deals queries', () => {
  const result = routeIncomingMessageToAgent('ما هي تفاصيل خط المبيعات وعروض الأسعار للعملاء؟', mockAgents);
  assert.equal(result.targetAgentId, 'sales-03');
  assert.equal(result.specialty, 'sales');
  assert.equal(result.isTargetActive, false);
});

test('routeIncomingMessageToAgent dispatches with explicit prefix #تسويق and #fin', () => {
  const mktResult = routeIncomingMessageToAgent('#تسويق استفسار عن حملة رمضان', mockAgents);
  assert.equal(mktResult.specialty, 'marketing');
  assert.equal(mktResult.confidence, 0.99);

  const finResult = routeIncomingMessageToAgent('#fin أريد مراجعة الضرائب', mockAgents);
  assert.equal(finResult.specialty, 'finance');
  assert.equal(finResult.confidence, 0.99);

  const salesResult = routeIncomingMessageToAgent('#sales إنشاء عرض أسعار', mockAgents);
  assert.equal(salesResult.specialty, 'sales');
  assert.equal(salesResult.confidence, 0.99);
});

test('createWhatsAppClickUrl formats link properly for phone and message', () => {
  const url = createWhatsAppClickUrl('+966 50 123 4567', 'سجلت مصروف 100 ريال');
  assert.ok(url.startsWith('https://wa.me/966501234567?text='));
  assert.ok(url.includes(encodeURIComponent('سجلت مصروف 100 ريال')));
});

test('getAgentRoadmapStats computes counts of active vs staged agents correctly', () => {
  const stats = getAgentRoadmapStats(mockAgents);
  assert.equal(stats.activeCount, 1);
  assert.equal(stats.stagedCount, 2);
  assert.equal(stats.totalCount, 3);
  assert.equal(stats.activePercentage, 33);
});

test('createTelegramClickUrl formats clean t.me link with bot username and start param', () => {
  const url1 = createTelegramClickUrl('@TariqFin_Bot', 'fin_budget');
  assert.equal(url1, 'https://t.me/TariqFin_Bot?start=fin_budget');

  const url2 = createTelegramClickUrl('TariqMarketing_Bot');
  assert.equal(url2, 'https://t.me/TariqMarketing_Bot');
});

test('routeIncomingMessageToAgent routes Telegram slash commands accurately', () => {
  const budgetCmd = routeIncomingMessageToAgent('/budget', mockAgents);
  assert.equal(budgetCmd.specialty, 'finance');
  assert.equal(budgetCmd.detectedCommand, '/budget');

  const expenseCmd = routeIncomingMessageToAgent('/expense 350 ريال برمجيات', mockAgents);
  assert.equal(expenseCmd.specialty, 'finance');
  assert.equal(expenseCmd.detectedCommand, '/expense');

  const mktCmd = routeIncomingMessageToAgent('/campaigns ميزانية الخريف', mockAgents);
  assert.equal(mktCmd.specialty, 'marketing');
  assert.equal(mktCmd.detectedCommand, '/campaigns');

  const salesCmd = routeIncomingMessageToAgent('/deals صفقات الربع الأخير', mockAgents);
  assert.equal(salesCmd.specialty, 'sales');
  assert.equal(salesCmd.detectedCommand, '/deals');
});

test('routeIncomingMessageToAgent routes Telegram forum topic thread IDs accurately', () => {
  const finTopic = routeIncomingMessageToAgent('مرحبا يا فريق', mockAgents, 101);
  assert.equal(finTopic.specialty, 'finance');
  assert.equal(finTopic.detectedTopicId, 101);

  const mktTopic = routeIncomingMessageToAgent('مرحبا يا فريق', mockAgents, 102);
  assert.equal(mktTopic.specialty, 'marketing');
  assert.equal(mktTopic.detectedTopicId, 102);

  const salesTopic = routeIncomingMessageToAgent('مرحبا يا فريق', mockAgents, 103);
  assert.equal(salesTopic.specialty, 'sales');
  assert.equal(salesTopic.detectedTopicId, 103);
});


