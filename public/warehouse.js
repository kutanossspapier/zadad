"use strict";
//sprawdzanie EAN
function isValidEan(ean) {
    if (!/^(\d{8}|\d{13})$/.test(ean)) {
        return false;
    }
    const digits = ean.split("").map(Number);
    const checkDigit = digits.pop();
    let sum = 0;
    digits.reverse().forEach((digit, index) => {
        sum += index % 2 === 0 ? digit * 3 : digit;
    });
    return (10 - (sum % 10)) % 10 === checkDigit;
}
//sprawdzanie produktu
function validateProduct(product, productId) {
    if (!isValidEan(product.ean)) {
        throw new Error("Kod EAN musi mieć 8 lub 13 cyfr i poprawną cyfrę kontrolną.");
    }
    const duplicate = queryOne("SELECT * FROM products WHERE ean = ? AND id IS NOT ?", [product.ean, productId]);
    if (duplicate) {
        throw new Error("Kod EAN jest już przypisany do produktu: " + duplicate.name);
    }
    if (product.name.length < 2) {
        throw new Error("Nazwa produktu musi mieć co najmniej 2 znaki.");
    }
    if (product.category === "") {
        throw new Error("Podaj kategorię.");
    }
    if (product.sector === "" || product.rack === "" || product.shelf === "") {
        throw new Error("Podaj pełną lokalizację: sektor, regał i półkę.");
    }
}
//dodanie do historii
function addOperation(type, product, quantity, user) {
    execute("INSERT INTO operations (type, product_ean, product_name, quantity, user_id, user_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [type, product.ean, product.name, quantity, user.id, user.full_name, new Date().toISOString()]);
}
//wyszukiwanie
function searchProducts(phrase) {
    const text = phrase.trim();
    return queryAll("SELECT * FROM products WHERE ean LIKE ? OR name LIKE ? ORDER BY name", [text + "%", "%" + text + "%"]);
}
//jeden produkt
function getProduct(productId) {
    return queryOne("SELECT * FROM products WHERE id = ?", [productId]);
}
//dodawanie i edycja produktu
function saveProduct(product, productId) {
    const user = requirePermission("MANAGE_PRODUCTS");
    reloadDatabase();
    validateProduct(product, productId);
    const values = [product.ean, product.name, product.category, product.sector, product.rack, product.shelf];
    if (productId === null) {
        execute("INSERT INTO products (ean, name, category, sector, rack, shelf) VALUES (?, ?, ?, ?, ?, ?)", values);
        addOperation("DODANIE", product, 0, user);
    }
    else {
        const changed = execute("UPDATE products SET ean = ?, name = ?, category = ?, sector = ?, rack = ?, shelf = ? WHERE id = ?", [...values, productId]);
        if (changed === 0) {
            throw new Error("Edytowany produkt został już usunięty.");
        }
        addOperation("EDYCJA", product, 0, user);
    }
    saveDatabase();
}
//usuwanie produktu
function deleteProduct(productId) {
    const user = requirePermission("MANAGE_PRODUCTS");
    reloadDatabase();
    const product = getProduct(productId);
    if (!product) {
        throw new Error("Produkt został już usunięty.");
    }
    execute("DELETE FROM products WHERE id = ?", [productId]);
    addOperation("USUNIĘCIE", product, product.quantity, user);
    saveDatabase();
    return product;
}
//przyjęcie i wydanie
function changeStock(productId, quantity, type) {
    const user = requirePermission("STOCK_OPERATIONS");
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Ilość musi być dodatnią liczbą całkowitą.");
    }
    reloadDatabase();
    const product = getProduct(productId);
    if (!product) {
        throw new Error("Produkt nie istnieje – mógł zostać usunięty.");
    }
    if (type === "PRZYJĘCIE") {
        execute("UPDATE products SET quantity = quantity + ? WHERE id = ?", [quantity, productId]);
    }
    else {
        const changed = execute("UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?", [quantity, productId, quantity]);
        if (changed === 0) {
            throw new Error("Nie można wydać " + quantity + " szt. – na stanie jest tylko " + product.quantity + " szt.");
        }
    }
    addOperation(type, product, quantity, user);
    saveDatabase();
    return getProduct(productId);
}
//historia
function getHistory() {
    requirePermission("VIEW_HISTORY");
    return queryAll("SELECT * FROM operations ORDER BY id DESC");
}
//podsumowanie stanów
function getStockSummary() {
    requirePermission("VIEW_REPORTS");
    return queryOne("SELECT COUNT(*) AS products, COALESCE(SUM(quantity), 0) AS pieces, COALESCE(SUM(quantity = 0), 0) AS empty FROM products");
}
//niski stan
function getLowStock(limit) {
    requirePermission("VIEW_REPORTS");
    return queryAll("SELECT * FROM products WHERE quantity < ? ORDER BY quantity, name", [limit]);
}
//ruch towaru
function getMovementReport() {
    requirePermission("VIEW_REPORTS");
    return queryAll(`
        SELECT product_name,
               SUM(CASE WHEN type = 'PRZYJĘCIE' THEN quantity ELSE 0 END) AS received,
               SUM(CASE WHEN type = 'WYDANIE' THEN quantity ELSE 0 END) AS issued
        FROM operations
        WHERE type IN ('PRZYJĘCIE', 'WYDANIE')
        GROUP BY product_ean, product_name
        ORDER BY issued DESC`);
}
//aktywność pracowników
function getUserActivity() {
    requirePermission("VIEW_REPORTS");
    return queryAll(`
        SELECT user_name, COUNT(*) AS operations, MAX(created_at) AS last_operation
        FROM operations
        GROUP BY user_id, user_name
        ORDER BY operations DESC`);
}
