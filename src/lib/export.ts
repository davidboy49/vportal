/**
 * Utility function to export data to an Excel-compatible CSV file.
 * Uses a UTF-8 Byte Order Mark (BOM) so Excel opens it with the correct encoding.
 */
export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
    const csvContent = [
        headers.map(h => `"${(h || "").replace(/"/g, '""')}"`).join(","),
        ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
