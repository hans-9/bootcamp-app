// Hand-rolled RFC-4180 parser so CSV import needs no third-party dependency.
export function parseCsv(text) {
  let input = String(text ?? '')
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1)

  const records = []
  let field = ''
  let record = []
  let inQuotes = false
  let i = 0

  const pushField = () => {
    record.push(field)
    field = ''
  }
  const pushRecord = () => {
    pushField()
    records.push(record)
    record = []
  }

  while (i < input.length) {
    const c = input[i]

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i += 1
        }
      } else {
        field += c
        i += 1
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
      i += 1
    } else if (c === ',') {
      pushField()
      i += 1
    } else if (c === '\r') {
      pushRecord()
      if (input[i + 1] === '\n') i += 2
      else i += 1
    } else if (c === '\n') {
      pushRecord()
      i += 1
    } else {
      field += c
      i += 1
    }
  }

  // Flush the trailing field/record unless the input ended on a newline.
  if (field !== '' || record.length > 0) pushRecord()

  // Drop blank trailing lines (a single empty field with no content).
  const cleaned = records.filter(
    (r) => !(r.length === 1 && r[0].trim() === ''),
  )

  if (cleaned.length === 0) return { headers: [], rows: [] }

  const [headers, ...rows] = cleaned
  return { headers, rows }
}

const escapeCell = (value) => {
  const s = String(value ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return lines.join('\r\n')
}
