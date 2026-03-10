import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { School as SchoolIcon, Users, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { fmtAFN } from '@/lib/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HomePage = () => {
  const { t } = useLanguage();
  const { schools, students, payments, expenses } = useData();

  const stats = useMemo(() => {
    const totalIncome = payments.reduce((s, p) => s + p.finalAmount, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    return {
      totalSchools: schools.length,
      totalStudents: students.filter(s => s.status === 'active').length,
      totalIncome, totalExp, netProfit: totalIncome - totalExp,
    };
  }, [schools, students, payments, expenses]);

  const chartData = useMemo(() => {
    return schools.map(sch => {
      const income = payments.filter(p => p.schoolId === sch.id).reduce((s, p) => s + p.finalAmount, 0);
      const exp = expenses.filter(e => e.schoolId === sch.id).reduce((s, e) => s + e.amount, 0);
      return { name: sch.name.substring(0, 12), income, expenses: exp, profit: income - exp };
    });
  }, [schools, payments, expenses]);

  const cards = [
    { label: t('totalSchools'), value: stats.totalSchools, icon: SchoolIcon, accent: 'bg-primary' },
    { label: t('totalStudents'), value: stats.totalStudents, icon: Users, accent: 'bg-primary' },
    { label: t('totalIncome'), value: fmtAFN(stats.totalIncome), icon: TrendingUp, accent: 'bg-success' },
    { label: t('totalExpenses'), value: fmtAFN(stats.totalExp), icon: TrendingDown, accent: 'bg-destructive' },
    { label: t('netProfit'), value: fmtAFN(stats.netProfit), icon: DollarSign, accent: stats.netProfit >= 0 ? 'bg-success' : 'bg-destructive' },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="font-bold text-xl text-foreground tracking-tight">{t('dashboard')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('home')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className={cn(
              "card-press rounded-2xl p-4 card-elevated",
              i === cards.length - 1 ? 'col-span-2' : ''
            )}
          >
            <div className="flex items-center gap-3">
              <div className={`${card.accent} p-2.5 rounded-xl shadow-sm`}>
                <card.icon size={20} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                <p className="text-lg font-bold text-foreground tracking-tight">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card-elevated rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t('income')} vs {t('expenses')}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 14,
                  fontSize: 12,
                  boxShadow: '0 8px 30px -12px rgba(0,0,0,0.15)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="income" name={t('income')} fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              <Bar dataKey="expenses" name={t('expenses')} fill="hsl(var(--destructive))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Need cn import
import { cn } from '@/lib/utils';
export default HomePage;
