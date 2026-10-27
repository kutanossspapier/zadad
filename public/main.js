"use strict";

//widoki
const loadingInfo = document.querySelector("#loadingInfo");
const loginView = document.querySelector("#loginView");
const passwordView = document.querySelector("#passwordView");
const appView = document.querySelector("#appView");
//logowanie
const loginForm = document.querySelector("#loginForm");
const loginField = document.querySelector("#loginField");
const passwordField = document.querySelector("#passwordField");
const loginError = document.querySelector("#loginError");
//zmiana hasła
const passwordForm = document.querySelector("#passwordForm");
const passwordInfo = document.querySelector("#passwordInfo");
const newPasswordField = document.querySelector("#newPasswordField");
const repeatPasswordField = document.querySelector("#repeatPasswordField");
const passwordError = document.querySelector("#passwordError");
const passwordCancelButton = document.querySelector("#passwordCancelButton");
//pasek u góry
const userInfo = document.querySelector("#userInfo");
const changePasswordButton = document.querySelector("#changePasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const messageBox = document.querySelector("#messageBox");
//formularz produktu
const productForm = document.querySelector("#productForm");
const formTitle = document.querySelector("#formTitle");
const eanField = document.querySelector("#eanField");
const nameField = document.querySelector("#nameField");
const categoryField = document.querySelector("#categoryField");
const sectorField = document.querySelector("#sectorField");
const rackField = document.querySelector("#rackField");
const shelfField = document.querySelector("#shelfField");
const cancelEditButton = document.querySelector("#cancelEditButton");
//tabele
const searchField = document.querySelector("#searchField");
const productsHead = document.querySelector("#productsHead");
const productsContainer = document.querySelector("#productsContainer");
const reportsContainer = document.querySelector("#reportsContainer");
const historyContainer = document.querySelector("#historyContainer");
//panel admina
const userForm = document.querySelector("#userForm");
const userLoginField = document.querySelector("#userLoginField");
const userNameField = document.querySelector("#userNameField");
const userRoleField = document.querySelector("#userRoleField");
const userPasswordField = document.querySelector("#userPasswordField");
const usersContainer = document.querySelector("#usersContainer");
const resetDatabaseButton = document.querySelector("#resetDatabaseButton");
//edytowany produkt
let editedProductId = null;
//pokazanie widoku
function showView(view) {
    [loadingInfo, loginView, passwordView, appView].forEach(element => {
        element.classList.toggle("hidden", element !== view);
    });
}
//wybór widoku
function showCurrentView() {
    if (!currentUser) {
        loginForm.reset();
        showView(loginView);
        loginField.focus();
    }
    else if (currentUser.must_change_password) {
        openPasswordView(true);
    }
    else {
        openApp();
    }
}
//okno zmiany hasła
function openPasswordView(forced) {
    passwordForm.reset();
    passwordError.textContent = "";
    passwordInfo.textContent = forced
        ? "Logujesz się hasłem tymczasowym – ustaw własne hasło (min. 8 znaków, litery i cyfry)."
        : "Hasło musi mieć min. 8 znaków i zawierać litery oraz cyfry.";
    passwordCancelButton.classList.toggle("hidden", forced);
    showView(passwordView);
    newPasswordField.focus();
}
//aplikacja po zalogowaniu
function openApp() {
    if (!currentUser)
        return;
    userInfo.textContent = currentUser.full_name + " (" + ROLE_NAMES[currentUser.role] + ")";
    document.querySelectorAll("[data-permission]").forEach(section => {
        section.classList.toggle("hidden", !can(section.dataset.permission));
    });
    showMessage("", "success");
    cancelEdit();
    showView(appView);
    buildAll();
}
//odświeżenie tabel
function buildAll() {
    if (can("VIEW_PRODUCTS"))
        buildProductList();
    if (can("VIEW_REPORTS"))
        buildReports();
    if (can("VIEW_HISTORY"))
        buildHistory();
    if (can("MANAGE_USERS"))
        buildUserList();
}
//komunikat
function showMessage(text, kind) {
    messageBox.textContent = text;
    messageBox.className = "message alert " + (kind === "success" ? "alert-success" : "alert-danger");
}
//akcja z obsługą błędu
async function runAction(action) {
    try {
        await action();
    }
    catch (error) {
        showMessage(error instanceof Error ? error.message : String(error), "error");
    }
    buildAll();
}
//komórka
function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = String(text);
    return cell;
}
//przycisk
function createButton(text, onClick, style = "outline-secondary") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm me-1 btn-" + style;
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
}
//wiersz
function createRow(cells) {
    const row = document.createElement("tr");
    cells.forEach(text => row.appendChild(createCell(text)));
    return row;
}
//pusty wiersz
function createEmptyRow(text, columns) {
    const row = createRow([text]);
    row.cells[0].colSpan = columns;
    return row;
}
//data
function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString("pl-PL");
}
//tabela produktów
function buildProductList() {
    const headers = ["EAN", "Nazwa", "Kategoria", "Lokalizacja", "Stan"];
    if (can("STOCK_OPERATIONS"))
        headers.push("Przyjęcie / wydanie");
    if (can("MANAGE_PRODUCTS"))
        headers.push("Akcje");
    const headRow = document.createElement("tr");
    headers.forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headRow.appendChild(th);
    });
    productsHead.innerHTML = "";
    productsHead.appendChild(headRow);
    productsContainer.innerHTML = "";
    const products = searchProducts(searchField.value);
    if (products.length === 0) {
        productsContainer.appendChild(createEmptyRow("Brak produktów.", headers.length));
        return;
    }
    products.forEach(product => {
        const location = "Sektor " + product.sector + " / Regał " + product.rack + " / Półka " + product.shelf;
        const row = createRow([product.ean, product.name, product.category, location, product.quantity]);
        if (product.quantity === 0) {
            row.cells[4].classList.add("empty-stock");
        }
        if (can("STOCK_OPERATIONS")) {
            const quantityInput = document.createElement("input");
            quantityInput.type = "number";
            quantityInput.min = "1";
            quantityInput.value = "1";
            quantityInput.className = "form-control form-control-sm d-inline-block me-1 quantity-input";
            const stockCell = document.createElement("td");
            stockCell.classList.add("text-nowrap");
            stockCell.appendChild(quantityInput);
            stockCell.appendChild(createButton("Przyjmij", () => onChangeStock(product.id, Number(quantityInput.value), "PRZYJĘCIE"), "success"));
            stockCell.appendChild(createButton("Wydaj", () => onChangeStock(product.id, Number(quantityInput.value), "WYDANIE"), "warning"));
            row.appendChild(stockCell);
        }
        if (can("MANAGE_PRODUCTS")) {
            const actionsCell = document.createElement("td");
            actionsCell.classList.add("text-nowrap");
            actionsCell.appendChild(createButton("Edytuj", () => startEdit(product), "outline-primary"));
            actionsCell.appendChild(createButton("Usuń", () => onDeleteProduct(product), "outline-danger"));
            row.appendChild(actionsCell);
        }
        productsContainer.appendChild(row);
    });
}
//przyjmij / wydaj
function onChangeStock(productId, quantity, type) {
    runAction(() => {
        const product = changeStock(productId, quantity, type);
        const verb = type === "PRZYJĘCIE" ? "Przyjęto " : "Wydano ";
        showMessage(verb + quantity + " szt. – " + product.name + ". Stan: " + product.quantity + " szt.", "success");
    });
}
//zapis produktu
function onSaveProduct() {
    const product = {
        ean: eanField.value.trim(),
        name: nameField.value.trim(),
        category: categoryField.value.trim(),
        sector: sectorField.value.trim(),
        rack: rackField.value.trim(),
        shelf: shelfField.value.trim(),
    };
    runAction(() => {
        saveProduct(product, editedProductId);
        showMessage((editedProductId === null ? "Dodano produkt: " : "Zapisano zmiany: ") + product.name, "success");
        cancelEdit();
    });
}
//usuwanie produktu
function onDeleteProduct(product) {
    if (!confirm("Usunąć produkt: " + product.name + "?"))
        return;
    runAction(() => {
        deleteProduct(product.id);
        if (editedProductId === product.id)
            cancelEdit();
        showMessage("Usunięto produkt: " + product.name, "success");
    });
}
//edycja
function startEdit(product) {
    editedProductId = product.id;
    eanField.value = product.ean;
    nameField.value = product.name;
    categoryField.value = product.category;
    sectorField.value = product.sector;
    rackField.value = product.rack;
    shelfField.value = product.shelf;
    formTitle.textContent = "Edycja produktu";
    cancelEditButton.classList.remove("hidden");
    eanField.focus();
}
//anulowanie edycji
function cancelEdit() {
    editedProductId = null;
    productForm.reset();
    formTitle.textContent = "Nowy produkt";
    cancelEditButton.classList.add("hidden");
}
//historia
function buildHistory() {
    historyContainer.innerHTML = "";
    const operations = getHistory();
    if (operations.length === 0) {
        historyContainer.appendChild(createEmptyRow("Brak operacji.", 5));
        return;
    }
    operations.forEach(operation => {
        const quantity = operation.quantity > 0 ? String(operation.quantity) : "–";
        historyContainer.appendChild(createRow([
            formatDate(operation.created_at),
            operation.type,
            operation.product_name + " (" + operation.product_ean + ")",
            quantity,
            operation.user_name,
        ]));
    });
}
//tabelka raportu
function createReportTable(title, headers, rows) {
    const fragment = document.createDocumentFragment();
    const heading = document.createElement("h3");
    heading.className = "h6 mt-3";
    heading.textContent = title;
    fragment.appendChild(heading);
    const table = document.createElement("table");
    table.className = "table table-sm table-bordered";
    const head = document.createElement("thead");
    head.className = "table-light";
    const body = document.createElement("tbody");
    const headRow = document.createElement("tr");
    headers.forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headRow.appendChild(th);
    });
    head.appendChild(headRow);
    if (rows.length === 0) {
        body.appendChild(createEmptyRow("Brak danych.", headers.length));
    }
    rows.forEach(cells => body.appendChild(createRow(cells)));
    table.appendChild(head);
    table.appendChild(body);
    fragment.appendChild(table);
    return fragment;
}
//raporty
function buildReports() {
    reportsContainer.innerHTML = "";
    const summary = getStockSummary();
    reportsContainer.appendChild(createReportTable("Podsumowanie stanów", ["Liczba produktów", "Sztuk na magazynie", "Produkty bez stanu"], [[summary.products, summary.pieces, summary.empty]]));
    reportsContainer.appendChild(createReportTable("Niski stan (poniżej 20 szt.)", ["Produkt", "Lokalizacja", "Stan"], getLowStock(20).map(p => [p.name, p.sector + " / " + p.rack + " / " + p.shelf, p.quantity])));
    reportsContainer.appendChild(createReportTable("Ruch towaru", ["Produkt", "Przyjęto", "Wydano"], getMovementReport().map(r => [r.product_name, r.received, r.issued])));
    reportsContainer.appendChild(createReportTable("Aktywność pracowników", ["Pracownik", "Liczba operacji", "Ostatnia operacja"], getUserActivity().map(r => [r.user_name, r.operations, formatDate(r.last_operation)])));
}
//lista kont
function buildUserList() {
    usersContainer.innerHTML = "";
    getUsers().forEach(user => {
        const status = user.active ? "aktywne" : "zablokowane";
        const row = createRow([user.login, user.full_name]);
        const roleSelect = document.createElement("select");
        roleSelect.className = "form-select form-select-sm";
        Object.keys(ROLE_NAMES).forEach(role => {
            const option = document.createElement("option");
            option.value = role;
            option.textContent = ROLE_NAMES[role];
            option.selected = role === user.role;
            roleSelect.appendChild(option);
        });
        roleSelect.addEventListener("change", () => runAction(() => {
            changeUserRole(user.id, roleSelect.value);
            showMessage("Zmieniono rolę użytkownika " + user.login, "success");
        }));
        const roleCell = document.createElement("td");
        roleCell.appendChild(roleSelect);
        row.appendChild(roleCell);
        row.appendChild(createCell(user.must_change_password ? status + ", hasło tymczasowe" : status));
        const actionsCell = document.createElement("td");
        actionsCell.classList.add("text-nowrap");
        actionsCell.appendChild(createButton(user.active ? "Zablokuj" : "Odblokuj", () => runAction(() => {
            setUserActive(user.id, !user.active);
            showMessage((user.active ? "Zablokowano konto " : "Odblokowano konto ") + user.login, "success");
        }), user.active ? "outline-danger" : "outline-success"));
        actionsCell.appendChild(createButton("Resetuj hasło", () => runAction(async () => {
            const temporaryPassword = await resetUserPassword(user.id);
            showMessage("Hasło tymczasowe dla " + user.login + ": " + temporaryPassword + " – przekaż je pracownikowi.", "success");
        })));
        row.appendChild(actionsCell);
        usersContainer.appendChild(row);
    });
}
//zdarzenia
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const error = await login(loginField.value.trim(), passwordField.value);
    if (error) {
        loginError.textContent = error;
        passwordField.value = "";
        return;
    }
    showCurrentView();
});
passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (newPasswordField.value !== repeatPasswordField.value) {
        passwordError.textContent = "Hasła nie są takie same.";
        return;
    }
    try {
        await changeOwnPassword(newPasswordField.value);
        openApp();
        showMessage("Hasło zostało zmienione.", "success");
    }
    catch (error) {
        passwordError.textContent = error instanceof Error ? error.message : String(error);
    }
});
passwordCancelButton.addEventListener("click", () => openApp());
changePasswordButton.addEventListener("click", () => openPasswordView(false));
logoutButton.addEventListener("click", () => {
    logout();
    showCurrentView();
});
productForm.addEventListener("submit", (e) => {
    e.preventDefault();
    onSaveProduct();
});
cancelEditButton.addEventListener("click", () => cancelEdit());
searchField.addEventListener("input", () => buildProductList());
userForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const login = userLoginField.value.trim();
    runAction(async () => {
        await createUser(login, userNameField.value.trim(), userRoleField.value, userPasswordField.value);
        userForm.reset();
        showMessage("Dodano użytkownika " + login + ". Przy pierwszym logowaniu ustawi własne hasło.", "success");
    });
});
resetDatabaseButton.addEventListener("click", () => {
    if (!confirm("Usunąć wszystkie dane i przywrócić bazę przykładową?"))
        return;
    runAction(async () => {
        await resetDatabase();
        logout();
        showCurrentView();
    });
});
//zmiany z innej karty
window.addEventListener("storage", (e) => {
    if (e.key !== DATABASE_KEY)
        return;
    reloadDatabase();
    restoreSession();
    if (currentUser && !appView.classList.contains("hidden")) {
        openApp();
    }
    else if (!currentUser) {
        showCurrentView();
    }
});
//start
async function startApp() {
    if (!window.crypto?.subtle) {
        loadingInfo.textContent = "Ta przeglądarka nie obsługuje bezpiecznego hashowania haseł (Web Crypto).";
        return;
    }
    try {
        const warning = await initDatabase();
        restoreSession();
        showCurrentView();
        if (warning) {
            loginError.textContent = warning;
        }
    }
    catch {
        loadingInfo.textContent = "Nie udało się wczytać bazy danych. Sprawdź połączenie z internetem (biblioteka sql.js ładuje się z CDN).";
    }
}
startApp();
