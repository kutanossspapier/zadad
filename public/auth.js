"use strict";
//nazwy ról
const ROLE_NAMES = {
    MAGAZYNIER: "Magazynier",
    KIEROWNIK: "Kierownik magazynu",
    ADMINISTRATOR: "Administrator",
};
//uprawnienia
const ROLE_PERMISSIONS = {
    MAGAZYNIER: ["VIEW_PRODUCTS", "STOCK_OPERATIONS"],
    KIEROWNIK: ["VIEW_PRODUCTS", "MANAGE_PRODUCTS", "VIEW_HISTORY", "VIEW_REPORTS"],
    ADMINISTRATOR: ["MANAGE_USERS"],
};
//sesja
const SESSION_KEY = "elektro-bud-session";
const USER_COLUMNS = "id, login, full_name, role, active, must_change_password";
//kto jest zalogowany
let currentUser = null;
//system hasowania sha256
async function hashPassword(password, saltHex) {
    // Web Crypto – wbudowane w przeglądarkę, nic nie trzeba instalować
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: 100000 }, key, 256);
    return bytesToHex(new Uint8Array(bits));
}
function createSalt() {
    return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}
//b na 16
function bytesToHex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
//16 na b
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
//dodawanie
async function insertUser(login, fullName, role, password, mustChange) {
    const salt = createSalt();
    const hash = await hashPassword(password, salt);
    db.run("INSERT INTO users (login, full_name, role, password_hash, password_salt, must_change_password) VALUES (?, ?, ?, ?, ?, ?)", [login, fullName, role, hash, salt, mustChange ? 1 : 0]);
}
//jak sie udalo to daje blad lub null
async function login(loginName, password) {
    reloadDatabase();
    const user = queryOne("SELECT * FROM users WHERE login = ?", [loginName]);
    if (!user || (await hashPassword(password, user.password_salt)) !== user.password_hash) {
        return "Nieprawidłowy login lub hasło.";
    }
    if (!user.active) {
        return "Konto jest zablokowane. Skontaktuj się z administratorem.";
    }
    sessionStorage.setItem(SESSION_KEY, String(user.id));
    currentUser = getUserById(user.id);
    return null;
}
function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    currentUser = null;
}
function restoreSession() {
    const userId = Number(sessionStorage.getItem(SESSION_KEY));
    const user = userId ? getUserById(userId) : null;
    currentUser = user && user.active ? user : null;
    if (!currentUser) {
        sessionStorage.removeItem(SESSION_KEY);
    }
}
function getUserById(id) {
    return queryOne("SELECT " + USER_COLUMNS + " FROM users WHERE id = ?", [id]);
}
//co moze zobaczyc co nie
function can(permission) {
    return currentUser !== null && ROLE_PERMISSIONS[currentUser.role].includes(permission);
}
/** Sprawdzenie uprawnień w logice – nie wystarczy ukryć przycisk w interfejsie. */
function requirePermission(permission) {
    if (!currentUser || !can(permission)) {
        throw new Error("Brak uprawnień do tej operacji.");
    }
    return currentUser;
}
//wymagania hasła
function validatePassword(password) {
    if (password.length < 8) {
        return "Hasło musi mieć co najmniej 8 znaków.";
    }
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
        return "Hasło musi zawierać litery i cyfry.";
    }
    return null;
}
//zmiana hasła
async function changeOwnPassword(newPassword) {
    if (!currentUser)
        throw new Error("Nie jesteś zalogowany.");
    const error = validatePassword(newPassword);
    if (error)
        throw new Error(error);
    reloadDatabase();
    const salt = createSalt();
    const hash = await hashPassword(newPassword, salt);
    execute("UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0 WHERE id = ?", [hash, salt, currentUser.id]);
    saveDatabase();
    currentUser = getUserById(currentUser.id);
}
