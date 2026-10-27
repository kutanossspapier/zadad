type Role = "MAGAZYNIER" | "KIEROWNIK" | "ADMINISTRATOR";

//uprawnienia
type Permission =
    | "VIEW_PRODUCTS"
    | "STOCK_OPERATIONS"
    | "MANAGE_PRODUCTS"
    | "VIEW_HISTORY"
    | "VIEW_REPORTS"
    | "MANAGE_USERS";

//hasła
type User = {
    id: number,
    login: string,
    full_name: string,
    role: Role,
    active: number,
    must_change_password: number,
}

//protektowanie hasłą
type UserWithPassword = User & {
    password_hash: string,
    password_salt: string,
}

//nazwy ról
const ROLE_NAMES: Record<Role, string> = {
    MAGAZYNIER: "Magazynier",
    KIEROWNIK: "Kierownik magazynu",
    ADMINISTRATOR: "Administrator",
};

//uprawnienia
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    MAGAZYNIER: ["VIEW_PRODUCTS", "STOCK_OPERATIONS"],
    KIEROWNIK: ["VIEW_PRODUCTS", "MANAGE_PRODUCTS", "VIEW_HISTORY", "VIEW_REPORTS"],
    ADMINISTRATOR: ["MANAGE_USERS"],
};

//sesja
const SESSION_KEY = "elektro-bud-session";
const USER_COLUMNS = "id, login, full_name, role, active, must_change_password";
//kto jest zalogowany
let currentUser: User | null = null;

//system hasowania sha256
async function hashPassword(password: string, saltHex: string): Promise<string> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: 100000 },
        key,
        256,
    );
    return bytesToHex(new Uint8Array(bits));
}

function createSalt(): string {
    return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

//b na 16
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

//16 na b
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

//dodawanie
async function insertUser(login: string, fullName: string, role: Role, password: string, mustChange: boolean): Promise<void> {
    const salt = createSalt();
    const hash = await hashPassword(password, salt);
    db.run(
        "INSERT INTO users (login, full_name, role, password_hash, password_salt, must_change_password) VALUES (?, ?, ?, ?, ?, ?)",
        [login, fullName, role, hash, salt, mustChange ? 1 : 0],
    );
}

//jak sie udalo to daje blad lub null
async function login(loginName: string, password: string): Promise<string | null> {
    reloadDatabase();
    const user = queryOne<UserWithPassword>("SELECT * FROM users WHERE login = ?", [loginName]);
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

function logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    currentUser = null;
}

function restoreSession(): void {
    const userId = Number(sessionStorage.getItem(SESSION_KEY));
    const user = userId ? getUserById(userId) : null;
    currentUser = user && user.active ? user : null;
    if (!currentUser) {
        sessionStorage.removeItem(SESSION_KEY);
    }
}

function getUserById(id: number): User | null {
    return queryOne<User>("SELECT " + USER_COLUMNS + " FROM users WHERE id = ?", [id]);
}

//co moze zobaczyc co nie
function can(permission: Permission): boolean {
    return currentUser !== null && ROLE_PERMISSIONS[currentUser.role].includes(permission);
}

/** Sprawdzenie uprawnień w logice - nie wystarczy ukryć przycisk w interfejsie. */
function requirePermission(permission: Permission): User {
    if (!currentUser || !can(permission)) {
        throw new Error("Brak uprawnień do tej operacji.");
    }
    return currentUser;
}

//wymagania hasła
function validatePassword(password: string): string | null {
    if (password.length < 8) {
        return "Hasło musi mieć co najmniej 8 znaków.";
    }
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
        return "Hasło musi zawierać litery i cyfry.";
    }
    return null;
}

//zmiana hasła
async function changeOwnPassword(newPassword: string): Promise<void> {
    if (!currentUser) throw new Error("Nie jesteś zalogowany.");
    const error = validatePassword(newPassword);
    if (error) throw new Error(error);

    reloadDatabase();
    const salt = createSalt();
    const hash = await hashPassword(newPassword, salt);
    execute("UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0 WHERE id = ?", [hash, salt, currentUser.id]);
    saveDatabase();
    currentUser = getUserById(currentUser.id);
}
