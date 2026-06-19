interface ToolbarProps {
  workbookName: string
  onImportCsv: () => void
  onImportExcel: () => void
  onImportCloud: () => void
  onAddSheet: () => void
  onRenameWorkbook: () => void
}

export default function Toolbar({
  workbookName,
  onImportCsv,
  onImportExcel,
  onImportCloud,
  onAddSheet,
  onRenameWorkbook,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h2 className="workbook-title" onClick={onRenameWorkbook} title="Click to rename">
          {workbookName}
        </h2>
      </div>
      <div className="toolbar-right">
        <button className="btn" onClick={onImportCsv}>Import CSV</button>
        <button className="btn" onClick={onImportExcel}>Import Excel</button>
        <button className="btn" onClick={onImportCloud}>Import Cloud</button>
        <button className="btn" onClick={onAddSheet}>+ Sheet</button>
      </div>
    </div>
  )
}
