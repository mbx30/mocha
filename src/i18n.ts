// i18n-ready string table — all user-facing text lives here.
// To add a locale, duplicate `en` and translate the values.

export type Locale = 'en'

const strings: Record<Locale, Record<string, string>> = {
  en: {
    'pdf.open': 'Open PDF',
    'pdf.open.shortcut': 'Ctrl+O to open',
    'pdf.recent': 'Recent PDFs',
    'pdf.no_recent': 'No recent files',
    'pdf.view_pages': 'View Pages',
    'pdf.save_history': 'Save to History',
    'pdf.run_preflight': 'Run Full Preflight (Ctrl+R)',
    'pdf.run_preflight_short': 'Run Full Preflight',
    'pdf.running_preflight': 'Running...',
    'pdf.back': '← Back',
    'pdf.preflight': 'Preflight',
    'pdf.prev_page': 'Previous page (←)',
    'pdf.next_page': 'Next page (→)',
    'pdf.page_of': 'Page {current} of {total}',
    'pdf.zoom_out': 'Zoom out',
    'pdf.zoom_in': 'Zoom in',
    'pdf.fit_width': 'Fit to width',
    'pdf.rendering': 'Rendering...',
    'pdf.preflight_fail': 'FAIL — {errors} error{s}, {warnings} warning{ws}',
    'pdf.preflight_pass': 'PASS — All checks passed',
    'pdf.run_check': 'Run Check',
    'pdf.save_report': 'Save Report',
    'pdf.saving': 'Saving...',
    'pdf.report_saved': 'Report saved!',
    'pdf.save_failed': 'Save failed: {msg}',
    'pdf.tools': 'PDF Tools',
    'pdf.tools_desc': 'Open a PDF to inspect and preflight it.',

    'viewer.overprint_preview': 'Overprint Preview',
    'viewer.normal': 'Normal',
    'viewer.measure': 'Measure',
    'viewer.stop': 'Stop',
    'viewer.distance': 'Distance: {d} px',
    'viewer.page_dimensions': 'Page: {w} × {h} mm',

    'inspector.title': 'PDF Inspector',
    'inspector.catalog': 'Catalog',
    'inspector.fonts': 'Fonts',
    'inspector.layers': 'Layers',
    'inspector.refresh': 'Refresh',

    'common.error': 'Error',
    'common.warning': 'Warning',
    'common.ok': 'OK',
    'common.close': 'Close',
    'common.remove': 'Remove',
    'common.hide': 'Hide',
    'common.show': 'Show',
  },
}

let currentLocale: Locale = 'en'

export function setLocale(locale: Locale) {
  currentLocale = locale
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const template = strings[currentLocale]?.[key] ?? strings.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name]?.toString() ?? `{${name}}`,
  )
}
