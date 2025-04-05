/* Image Combiner Pro - table.js
 * Version: 1.0.1
 * Author: skoki
 * GitHub: https://github.com/skokivPr
 */



let editor1, editor2;

// Inicjalizacja edytorów CodeMirror
document.addEventListener('DOMContentLoaded', function () {
    editor1 = CodeMirror.fromTextArea(document.getElementById('editor1'), {
        theme: 'monokai',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        lineWrapping: true
    });

    editor2 = CodeMirror.fromTextArea(document.getElementById('editor2'), {
        theme: 'monokai',
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        lineWrapping: true
    });

    // Nasłuchiwanie zmian w edytorach
    editor1.on('change', function () {
        const text = editor1.getValue();
        updateTable(text, 1);
    });

    editor2.on('change', function () {
        const text = editor2.getValue();
        updateTable(text, 2);
    });
});

function handleFileSelect(input, tableNumber) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            if (tableNumber === 1) {
                editor1.setValue(text);
            } else {
                editor2.setValue(text);
            }
        };
        reader.readAsText(file);
    }
}

function processText(text) {
    const lines = text.split('\n');
    const result = [];
    let currentLine = [];
    let isInQuotes = false;
    let quotedContent = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const columns = line.split('\t');

        for (let j = 0; j < columns.length; j++) {
            let col = columns[j].trim();

            if (!isInQuotes && col.startsWith('"')) {
                isInQuotes = true;
                quotedContent = [col.substring(1)];
            } else if (isInQuotes) {
                if (col.endsWith('"')) {
                    isInQuotes = false;
                    quotedContent.push(col.substring(0, col.length - 1));
                    currentLine.push('"' + quotedContent.join(' ') + '"');
                } else {
                    quotedContent.push(col);
                }
            } else {
                currentLine.push(col);
            }
        }

        if (!isInQuotes) {
            if (currentLine.length > 0) {
                result.push(currentLine);
                currentLine = [];
            }
        }
    }

    return result;
}

function extractIB(vrid) {
    // Usuń cudzysłowy jeśli istnieją
    vrid = vrid.replace(/"/g, '');

    // Znajdź ostatnią grupę cyfr kończącą się na 0994
    const match = vrid.match(/\d+0994(?!\d)/);
    return match ? '0994' : '';
}

function updateRecordCount(tableId, countId) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    const rows = tbody.getElementsByTagName('tr');
    const actualRows = Array.from(rows).filter(row => !row.classList.contains('summary-row'));
    const countElement = document.getElementById(countId);
    if (countElement) {
        countElement.textContent = `(${actualRows.length} rekordów)`;
    }
}

function updateTable(text, tableNumber) {
    const tableBody = document.getElementById(`tableBody${tableNumber}`);
    const processedLines = processText(text);
    const activeColumn = document.querySelector(`#dataTable${tableNumber} th.active-column`);
    const activeColumnIndex = activeColumn ? activeColumn.cellIndex : -1;

    // Wyczyść tabelę przed dodaniem nowych danych
    tableBody.innerHTML = '';

    processedLines.forEach(columns => {
        if (columns.length >= 1) {
            const vrid = columns[2] || '';
            const ib = extractIB(vrid);

            const row = document.createElement('tr');
            row.innerHTML = `
                            <td class="timestamp">${escapeHtml(columns[0] || '')}</td>
                            <td class="user">${escapeHtml(columns[1] || '')}</td>
                            <td class="vrid">${escapeHtml(vrid)}</td>
                            <td class="scac">${escapeHtml(columns[3] || '')}</td>
                            <td class="traktor">${escapeHtml(columns[4] || '')}</td>
                            <td class="trailer">${escapeHtml(columns[5] || '')}</td>
                        `;
            row.dataset.ib = ib;

            // Przywróć zaznaczenie kolumny jeśli było aktywne
            if (activeColumnIndex >= 0) {
                row.getElementsByTagName('td')[activeColumnIndex].classList.add('highlight-column');
            }

            tableBody.appendChild(row);
        }
    });

    // Dodaj wiersz sumy
    addSummaryRow(tableBody);

    // Aktualizuj licznik rekordów w nagłówku
    updateRecordCount(`tableBody${tableNumber}`, `table${tableNumber}Count`);
}

function addSummaryRow(tableBody) {
    // Usuń istniejący wiersz sumy jeśli istnieje
    const existingSummary = tableBody.querySelector('.summary-row');
    if (existingSummary) {
        existingSummary.remove();
    }

    const rows = tableBody.getElementsByTagName('tr');
    const rowCount = rows.length;

    if (rowCount > 0) {
        // Dodaj separator
        const separatorRow = document.createElement('tr');
        separatorRow.innerHTML = '<td colspan="6" style="padding: 0; border-bottom: 2px solid #569cd6;"></td>';
        tableBody.appendChild(separatorRow);

        // Dodaj wiersz sumy
        const summaryRow = document.createElement('tr');
        summaryRow.className = 'summary-row';
        summaryRow.style.backgroundColor = '#2d2d2d';
        summaryRow.innerHTML = `
                        <td colspan="2" style="text-align: right; padding: 8px; color: #569cd6; font-weight: bold;">Suma rekordów:</td>
                        <td colspan="4" style="text-align: left; padding: 8px; color: #569cd6; font-weight: bold;">${rowCount}</td>
                    `;
        tableBody.appendChild(summaryRow);
    }
}

function loadToIB() {
    console.log('Rozpoczynam loadToIB');

    const ibTableBody = document.getElementById('ibTableBody');
    const obTableBody = document.getElementById('obTableBody');
    const atseuTableBody = document.getElementById('atseuTableBody');

    if (!ibTableBody || !obTableBody || !atseuTableBody) {
        console.error('Nie znaleziono wszystkich elementów tbody');
        return;
    }

    console.log('Znalezione elementy tbody:', {
        ibTableBody: !!ibTableBody,
        obTableBody: !!obTableBody,
        atseuTableBody: !!atseuTableBody
    });

    ibTableBody.innerHTML = '';
    obTableBody.innerHTML = '';
    atseuTableBody.innerHTML = '';

    // Zbierz wszystkie wiersze z obu tabel
    const table1Rows = Array.from(document.getElementById('tableBody1')?.getElementsByTagName('tr') || [])
        .filter(row => !row.classList.contains('summary-row'));
    const table2Rows = Array.from(document.getElementById('tableBody2')?.getElementsByTagName('tr') || [])
        .filter(row => !row.classList.contains('summary-row'));
    const allRows = [...table1Rows, ...table2Rows];

    console.log('Liczba wierszy:', {
        table1Rows: table1Rows.length,
        table2Rows: table2Rows.length,
        allRows: allRows.length
    });

    if (allRows.length === 0) {
        console.log('Brak danych do przetworzenia');
        // Aktualizuj liczniki na 0
        document.getElementById('ibTableCount').textContent = '(0 rekordów)';
        document.getElementById('obTableCount').textContent = '(0 rekordów)';
        document.getElementById('atseuTableCount').textContent = '(0 rekordów)';
        return;
    }

    // Filtruj i dodaj wiersze
    const uniqueVrids = new Set();
    let ibCount = 0;
    let obCount = 0;
    let atseuCount = 0;

    allRows.forEach(row => {
        const cells = Array.from(row.getElementsByTagName('td'));
        // Sprawdź czy mamy wystarczającą liczbę komórek
        if (cells.length < 6) {
            console.warn('Wiersz ma nieprawidłową liczbę komórek:', cells.length);
            return;
        }

        const vrid = cells[2]?.textContent?.trim() || '';
        const trailer = cells[5]?.textContent?.trim() || '';

        if (!vrid) {
            console.warn('Pusty VRID, pomijam wiersz');
            return;
        }

        const newRow = document.createElement('tr');
        newRow.innerHTML = `
                        <td class="timestamp">${cells[0]?.textContent || ''}</td>
                        <td class="user">${cells[1]?.textContent || ''}</td>
                        <td class="vrid">${vrid}</td>
                        <td class="scac">${cells[3]?.textContent || ''}</td>
                        <td class="traktor">${cells[4]?.textContent || ''}</td>
                        <td class="trailer">${trailer}</td>
                    `;

        if (trailer.includes('VS') && !uniqueVrids.has(vrid)) {
            uniqueVrids.add(vrid);
            atseuTableBody.appendChild(newRow.cloneNode(true));
            atseuCount++;
        }
        else if (vrid.includes('0994') && !uniqueVrids.has(vrid)) {
            uniqueVrids.add(vrid);
            ibTableBody.appendChild(newRow.cloneNode(true));
            ibCount++;
        }
        else if (!uniqueVrids.has(vrid)) {
            uniqueVrids.add(vrid);
            obTableBody.appendChild(newRow.cloneNode(true));
            obCount++;
        }
    });

    console.log('Po przetworzeniu wierszy:', {
        ibCount,
        obCount,
        atseuCount,
        uniqueVrids: uniqueVrids.size
    });

    // Dodaj wiersze sumy do każdej tabeli
    addSummaryRow(ibTableBody);
    addSummaryRow(obTableBody);
    addSummaryRow(atseuTableBody);

    // Aktualizuj liczniki rekordów w nagłówkach
    const ibCountElement = document.getElementById('ibTableCount');
    const obCountElement = document.getElementById('obTableCount');
    const atseuCountElement = document.getElementById('atseuTableCount');

    console.log('Znalezione elementy liczników:', {
        ibCountElement: !!ibCountElement,
        obCountElement: !!obCountElement,
        atseuCountElement: !!atseuCountElement
    });

    if (ibCountElement) {
        ibCountElement.textContent = `(${ibCount} rekordów)`;
        console.log('Zaktualizowano ibCount:', ibCount);
    }
    if (obCountElement) {
        obCountElement.textContent = `(${obCount} rekordów)`;
        console.log('Zaktualizowano obCount:', obCount);
    }
    if (atseuCountElement) {
        atseuCountElement.textContent = `(${atseuCount} rekordów)`;
        console.log('Zaktualizowano atseuCount:', atseuCount);
    }
}

function clearAll() {
    editor1.setValue('');
    editor2.setValue('');
    document.getElementById('tableBody1').innerHTML = '';
    document.getElementById('tableBody2').innerHTML = '';
    document.getElementById('ibTableBody').innerHTML = '';
    document.getElementById('obTableBody').innerHTML = '';
    document.getElementById('atseuTableBody').innerHTML = '';

    // Wyczyść liczniki rekordów
    const countElements = document.querySelectorAll('.record-count');
    countElements.forEach(element => {
        element.textContent = '(0 rekordów)';
    });

    // Wyczyść podsumowanie statystyk
    const summaryStats = document.getElementById('summaryStats');
    if (summaryStats) {
        summaryStats.innerHTML = '';
    }
}

function formatAndCompare() {
    try {
        const text1 = editor1.getValue();
        const text2 = editor2.getValue();

        if (!text1 && !text2) {
            console.log('Brak danych do porównania');
            return;
        }

        updateTable(text1, 1);
        updateTable(text2, 2);
        compareData();
    } catch (error) {
        console.error('Błąd podczas formatowania i porównywania:', error);
    }
}

function compareData() {
    try {
        const tableBody1 = document.getElementById('tableBody1');
        const tableBody2 = document.getElementById('tableBody2');

        if (!tableBody1 || !tableBody2) {
            console.error('Nie znaleziono elementów tabel');
            return;
        }

        const table1Rows = Array.from(tableBody1.getElementsByTagName('tr'))
            .filter(row => !row.classList.contains('summary-row'));
        const table2Rows = Array.from(tableBody2.getElementsByTagName('tr'))
            .filter(row => !row.classList.contains('summary-row'));

        // Przygotuj zbiory VRID dla obu tabel
        const vridsFromA1 = new Map();
        const vridsFromB1 = new Map();

        // Zbierz dane z tabeli A1
        table1Rows.forEach(row => {
            const cells = Array.from(row.getElementsByTagName('td'));
            if (cells.length >= 3) {
                const vrid = cells[2].textContent.trim();
                if (vrid) {
                    vridsFromA1.set(vrid, row);
                }
            }
        });

        // Zbierz dane z tabeli B1
        table2Rows.forEach(row => {
            const cells = Array.from(row.getElementsByTagName('td'));
            if (cells.length >= 3) {
                const vrid = cells[2].textContent.trim();
                if (vrid) {
                    vridsFromB1.set(vrid, row);
                }
            }
        });

        // Przygotuj statystyki
        const matchingRecords = [];
        const uniqueA1Records = [];
        const uniqueB1Records = [];

        // Znajdź pasujące i unikalne rekordy
        vridsFromA1.forEach((row, vrid) => {
            if (vridsFromB1.has(vrid)) {
                matchingRecords.push(row);
            } else {
                uniqueA1Records.push(row);
            }
        });

        vridsFromB1.forEach((row, vrid) => {
            if (!vridsFromA1.has(vrid)) {
                uniqueB1Records.push(row);
            }
        });

        // Aktualizuj podsumowanie
        const summaryStats = document.getElementById('summaryStats');
        if (summaryStats) {
            summaryStats.innerHTML = `
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                                <div>
                                    <h4 style="color: #4ec9b0; margin: 0;">Wspólne rekordy</h4>
                                    <p style="font-size: 24px; margin: 10px 0;">${matchingRecords.length}</p>
                                </div>
                                <div>
                                    <h4 style="color: #ce9178; margin: 0;">Unikalne w A1</h4>
                                    <p style="font-size: 24px; margin: 10px 0;">${uniqueA1Records.length}</p>
                                </div>
                                <div>
                                    <h4 style="color: #dcdcaa; margin: 0;">Unikalne w B1</h4>
                                    <p style="font-size: 24px; margin: 10px 0;">${uniqueB1Records.length}</p>
                                </div>
                            </div>
                        `;
        }

        // Funkcja pomocnicza do wypełniania tabel
        function fillTable(records, tableId, countId) {
            const tbody = document.querySelector(`#${tableId} tbody`);
            if (!tbody) {
                console.error(`Nie znaleziono tbody dla tabeli ${tableId}`);
                return;
            }

            const activeColumn = document.querySelector(`#${tableId} th.active-column`);
            const activeColumnIndex = activeColumn ? activeColumn.cellIndex : -1;

            tbody.innerHTML = '';
            records.forEach(row => {
                const newRow = document.createElement('tr');
                newRow.innerHTML = row.innerHTML;

                // Przywróć zaznaczenie kolumny jeśli było aktywne
                if (activeColumnIndex >= 0) {
                    const cells = newRow.getElementsByTagName('td');
                    if (cells.length > activeColumnIndex) {
                        cells[activeColumnIndex].classList.add('highlight-column');
                    }
                }

                tbody.appendChild(newRow);
            });

            // Dodaj wiersz sumy
            addSummaryRow(tbody);

            // Aktualizuj licznik rekordów w nagłówku
            const countElement = document.getElementById(countId);
            if (countElement) {
                countElement.textContent = `(${records.length} rekordów)`;
            }
        }

        // Wypełnij tabele danymi
        fillTable(matchingRecords, 'matchingRecordsTable', 'matchingRecordsCount');
        fillTable(uniqueA1Records, 'uniqueA1Table', 'uniqueA1Count');
        fillTable(uniqueB1Records, 'uniqueB1Table', 'uniqueB1Count');

    } catch (error) {
        console.error('Błąd podczas porównywania danych:', error);
    }
}

function getColumnName(index) {
    const columns = ['Data UTC', 'User ID', 'VRID', 'SCAC', 'TRAKTOR', 'TRAILER'];
    return columns[index] || `Kolumna ${index + 1}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Zamykanie modali
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Dodaj funkcję sortowania
function sortTable(tableId, columnIndex, ascending = true) {
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'))
        .filter(row => !row.classList.contains('summary-row'));

    // Zachowaj wiersz sumy
    const summaryRow = tbody.querySelector('.summary-row');
    const separatorRow = summaryRow?.previousElementSibling;

    // Sortuj wiersze
    rows.sort((a, b) => {
        const aValue = a.getElementsByTagName('td')[columnIndex]?.textContent.trim() || '';
        const bValue = b.getElementsByTagName('td')[columnIndex]?.textContent.trim() || '';

        // Sprawdź czy to data (pierwsza kolumna)
        if (columnIndex === 0) {
            const dateA = new Date(aValue);
            const dateB = new Date(bValue);
            return ascending ? dateA - dateB : dateB - dateA;
        }

        // Dla pozostałych kolumn - sortowanie tekstowe
        return ascending ?
            aValue.localeCompare(bValue, undefined, { numeric: true }) :
            bValue.localeCompare(aValue, undefined, { numeric: true });
    });

    // Wyczyść tbody
    tbody.innerHTML = '';

    // Dodaj posortowane wiersze
    rows.forEach(row => tbody.appendChild(row));

    // Przywróć wiersz sumy
    if (separatorRow) tbody.appendChild(separatorRow);
    if (summaryRow) tbody.appendChild(summaryRow);

    // Aktualizuj strzałki sortowania
    updateSortArrows(table, columnIndex, ascending);
}

function updateSortArrows(table, columnIndex, ascending) {
    // Usuń wszystkie strzałki
    table.querySelectorAll('th .sort-arrow').forEach(arrow => arrow.remove());

    // Dodaj strzałkę do aktualnie sortowanej kolumny
    const header = table.querySelector(`th:nth-child(${columnIndex + 1})`);
    const arrow = document.createElement('span');
    arrow.className = 'sort-arrow';
    arrow.textContent = ascending ? ' ↑' : ' ↓';
    arrow.style.color = '#569cd6';
    header.appendChild(arrow);
}

// Zmodyfikuj funkcję highlightColumn, aby obsługiwała sortowanie
function highlightColumn(tableId, columnIndex, event) {
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tr');
    const activeHeader = table.querySelector('th.active-column');

    // Jeśli wciśnięty Shift, sortuj tabelę
    if (event && event.shiftKey) {
        const currentArrow = table.querySelector(`th:nth-child(${columnIndex + 1}) .sort-arrow`);
        const isAscending = !currentArrow || currentArrow.textContent === ' ↓';
        sortTable(tableId, columnIndex, isAscending);
        return;
    }

    // Usuń poprzednie zaznaczenie i przycisk kopiowania
    if (activeHeader) {
        const copyButton = activeHeader.querySelector('.copy-button');
        if (copyButton) {
            copyButton.remove();
        }
        activeHeader.classList.remove('active-column');
        const prevIndex = activeHeader.cellIndex;
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            if (cells.length > prevIndex) {
                cells[prevIndex].classList.remove('highlight-column');
            }
        }
    }

    // Dodaj nowe zaznaczenie
    const header = table.querySelector(`th:nth-child(${columnIndex + 1})`);
    if (header && (!activeHeader || activeHeader !== header)) {
        // Dodaj przycisk kopiowania
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = 'Kopiuj';
        copyButton.onclick = function (e) {
            e.stopPropagation();
            copyColumnToClipboard(tableId, columnIndex);
        };
        header.appendChild(copyButton);

        header.classList.add('active-column');
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            if (cells.length > columnIndex) {
                cells[columnIndex].classList.add('highlight-column');
            }
        }
    }
}

function copyColumnToClipboard(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tr');
    const values = [];

    // Zbierz wartości z komórek (pomijając nagłówek)
    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        if (cells.length > columnIndex) {
            const value = cells[columnIndex].textContent.trim();
            if (value) values.push(value);
        }
    }

    // Kopiuj do schowka
    if (values.length > 0) {
        const text = values.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            const copyButton = table.querySelector('.copy-button');
            if (copyButton) {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = 'Skopiowano!';
                copyButton.style.backgroundColor = '#2ea043';
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.style.backgroundColor = '';
                }, 1500);
            }
        }).catch(err => {
            console.error('Błąd podczas kopiowania:', err);
        });
    }
}

// Zmodyfikuj inicjalizację nasłuchiwania kliknięć
document.addEventListener('DOMContentLoaded', function () {
    // ... existing DOMContentLoaded code ...

    // Dodaj obsługę kliknięć dla wszystkich tabel
    const tables = ['dataTable1', 'dataTable2', 'ibTable', 'obTable', 'atseuTable',
        'matchingRecordsTable', 'uniqueA1Table', 'uniqueB1Table'];

    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            const headers = table.getElementsByTagName('th');
            for (let i = 0; i < headers.length; i++) {
                headers[i].addEventListener('click', function (event) {
                    highlightColumn(tableId, i, event);
                });
            }
        }
    });
});