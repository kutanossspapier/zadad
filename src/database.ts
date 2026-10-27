//typy z sql.js
type SqlValue = number | string | Uint8Array | null;

type SqlStatement = {
    bind(params?: SqlValue[]): boolean,
    step(): boolean,
    getAsObject(): Record<string, SqlValue>,
    free(): boolean,
}

type SqlDatabase = {
    run(sql: string, params?: SqlValue[]): SqlDatabase,
    exec(sql: string): unknown[],
    prepare(sql: string): SqlStatement,
    export(): Uint8Array,
    getRowsModified(): number,
    close(): void,
}

type SqlJsStatic = {
    Database: new (data?: Uint8Array) => SqlDatabase,
}

//ładowanie sql.js
declare function initSqlJs(config: { locateFile: (file: string) => string }): Promise<SqlJsStatic>;

//klucz w localStorage
const DATABASE_KEY = "elektro-bud-db";

//baza
let SQL: SqlJsStatic;
let db: SqlDatabase;

//tabele
const SCHEMA = `
    --użytkownicy
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('MAGAZYNIER', 'KIEROWNIK', 'ADMINISTRATOR')),
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        must_change_password INTEGER NOT NULL DEFAULT 0
    );

    --produkty
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ean TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        sector TEXT NOT NULL,
        rack TEXT NOT NULL,
        shelf TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
    );

    --historia
    CREATE TABLE operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        product_ean TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_name TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
`;

//wczytanie bazy
async function initDatabase(): Promise<string | null> {
    SQL = await initSqlJs({
        locateFile: file => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/" + file,
    });

    const saved = localStorage.getItem(DATABASE_KEY);
    if (saved !== null) {
        try {
            db = new SQL.Database(base64ToBytes(saved));
            queryAll("SELECT COUNT(*) AS n FROM users");
            return null;
        } catch {
            await createNewDatabase();
            return "Zapisana baza była uszkodzona - utworzono nową z danymi przykładowymi.";
        }
    }

    await createNewDatabase();
    return null;
}

//nowa baza
async function createNewDatabase(): Promise<void> {
    db = new SQL.Database();
    db.exec(SCHEMA);
    await seedDatabase();
    saveDatabase();
}

//dane przykładowe
async function seedDatabase(): Promise<void> {
    await insertUser("admin", "Anna Administrator", "ADMINISTRATOR", "admin123", false);
    await insertUser("kierownik", "Krzysztof Kierownik", "KIEROWNIK", "kierownik123", false);
    await insertUser("magazynier", "Jan Kowalski", "MAGAZYNIER", "magazynier123", false);
    await insertUser("magazynier2", "Piotr Nowak", "MAGAZYNIER", "magazynier123", false);

    const products: SqlValue[][] = [
        ["5901234123457", "Przewód YDY 3x2,5 mm² (100 m)", "Przewody", "A", "1", "2", 14],
        ["5900000000015", "Gniazdo podwójne z uziemieniem", "Osprzęt", "A", "3", "1", 120],
        ["5900000000022", "Wyłącznik nadprądowy B16", "Zabezpieczenia", "B", "1", "4", 48],
        ["5900000000039", "Puszka podtynkowa fi 60", "Osprzęt", "A", "3", "3", 600],
        ["5900000000046", "Klej do płytek C2TE 25 kg", "Chemia budowlana", "C", "2", "1", 35],
        ["5900000000053", "Taśma izolacyjna 19 mm", "Akcesoria", "B", "4", "2", 0],
    ];
    products.forEach(product => {
        db.run("INSERT INTO products (ean, name, category, sector, rack, shelf, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)", product);
    });
}

//zapis do localStorage
function saveDatabase(): void {
    localStorage.setItem(DATABASE_KEY, bytesToBase64(db.export()));
}

//odświeżenie bazy
function reloadDatabase(): void {
    const saved = localStorage.getItem(DATABASE_KEY);
    if (saved === null) return;
    try {
        const fresh = new SQL.Database(base64ToBytes(saved));
        db.close();
        db = fresh;
    } catch {
    }
}

//reset bazy
async function resetDatabase(): Promise<void> {
    db.close();
    await createNewDatabase();
}

//select
function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
    const statement = db.prepare(sql);
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) {
        rows.push(statement.getAsObject() as T);
    }
    statement.free();
    return rows;
}

//select jednego wiersza
function queryOne<T>(sql: string, params: SqlValue[] = []): T | null {
    return queryAll<T>(sql, params)[0] ?? null;
}

//insert / update / delete
function execute(sql: string, params: SqlValue[] = []): number {
    db.run(sql, params);
    return db.getRowsModified();
}

//bajty na tekst
function bytesToBase64(bytes: Uint8Array): string {
    let text = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(text);
}

//tekst na bajty
function base64ToBytes(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}
