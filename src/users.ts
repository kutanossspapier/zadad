//lista kont
function getUsers(): User[] {
    requirePermission("MANAGE_USERS");
    return queryAll<User>("SELECT " + USER_COLUMNS + " FROM users ORDER BY role, login");
}

//nowe konto
async function createUser(login: string, fullName: string, role: Role, password: string): Promise<void> {
    requirePermission("MANAGE_USERS");
    if (!/^[a-z0-9._-]{3,}$/.test(login)) {
        throw new Error("Login: co najmniej 3 znaki – małe litery, cyfry, kropka, myślnik lub podkreślnik.");
    }
    if (fullName.length < 3) {
        throw new Error("Podaj imię i nazwisko.");
    }
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    reloadDatabase();
    if (queryOne<User>("SELECT " + USER_COLUMNS + " FROM users WHERE login = ?", [login])) {
        throw new Error("Login " + login + " jest już zajęty.");
    }
    await insertUser(login, fullName, role, password, true);
    saveDatabase();
}

//zmiana roli
function changeUserRole(userId: number, role: Role): void {
    requirePermission("MANAGE_USERS");
    reloadDatabase();
    if (userId === currentUser?.id && role !== "ADMINISTRATOR") {
        throw new Error("Nie możesz odebrać uprawnień administratora samemu sobie.");
    }
    execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    saveDatabase();
}

//blokowanie konta
function setUserActive(userId: number, active: boolean): void {
    requirePermission("MANAGE_USERS");
    reloadDatabase();
    if (userId === currentUser?.id) {
        throw new Error("Nie możesz zablokować własnego konta.");
    }
    execute("UPDATE users SET active = ? WHERE id = ?", [active ? 1 : 0, userId]);
    saveDatabase();
}

//reset hasła
async function resetUserPassword(userId: number): Promise<string> {
    requirePermission("MANAGE_USERS");
    const temporaryPassword = "Tmp" + (100000 + crypto.getRandomValues(new Uint32Array(1))[0]! % 900000);
    const salt = createSalt();
    const hash = await hashPassword(temporaryPassword, salt);

    reloadDatabase();
    execute("UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 1 WHERE id = ?", [hash, salt, userId]);
    saveDatabase();
    return temporaryPassword;
}
