import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// Recharts renders colors as SVG attributes, which can't resolve var(), so we
// read the palette tokens off :root and re-read whenever the theme flips.
function useChartColors() {
  const read = () => {
    const s = getComputedStyle(document.documentElement)
    const get = (name) => s.getPropertyValue(name).trim()
    return {
      axis: get('--muted'),
      grid: get('--border'),
      accent: get('--accent'),
      draft: get('--st-draft'),
      ready: get('--st-ready'),
      passed: get('--st-passed'),
      failed: get('--st-failed'),
      skipped: get('--st-skipped'),
    }
  }
  const [colors, setColors] = useState(read)
  useEffect(() => {
    setColors(read()) // re-read after mount in case the stylesheet applied late
    const obs = new MutationObserver(() => setColors(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return colors
}

// Buckets and run dates are anchored to UTC on the server, so format in UTC too —
// otherwise negative-offset timezones shift the label to the previous day.
function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '7px',
  fontSize: '13px',
}

export default function DashboardCharts({ trends }) {
  const { passRateTrend, bugsPerWeek, coverageByStatus } = trends
  const totalCases = coverageByStatus.reduce((sum, s) => sum + s.count, 0)
  const c = useChartColors()
  const STATUS_COLORS = {
    draft: c.draft,
    ready: c.ready,
    passed: c.passed,
    failed: c.failed,
    skipped: c.skipped,
  }

  return (
    <div className="charts-grid">
      <div className="card chart-card chart-wide">
        <div className="dash-panel-head">Pass-rate trend</div>
        <div className="chart-body">
        {passRateTrend.length === 0 ? (
          <div className="empty">No test runs yet. Pass rate appears once a run finishes.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={passRateTrend} margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                stroke={c.axis}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke={c.axis}
                fontSize={12}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={shortDate}
                formatter={(v) => [`${v}%`, 'Pass rate']}
              />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke={c.accent}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>

      <div className="card chart-card">
        <div className="dash-panel-head">Bugs opened vs. closed</div>
        <div className="chart-body">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bugsPerWeek} margin={{ top: 12, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis
              dataKey="weekStart"
              tickFormatter={shortDate}
              stroke={c.axis}
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke={c.axis} fontSize={12} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(d) => `Week of ${shortDate(d)}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="opened" name="Opened" fill={c.failed} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="closed" name="Closed" fill={c.passed} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="card chart-card">
        <div className="dash-panel-head">Coverage by status</div>
        <div className="chart-body">
        {totalCases === 0 ? (
          <div className="empty">No test cases yet. Add one to see coverage.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={coverageByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {coverageByStatus.map((s) => (
                  <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [`${v} case${v === 1 ? '' : 's'}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>
    </div>
  )
}
