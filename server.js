const express = require("express");
const exphbs = require("express-handlebars");
const jwt = require("jsonwebtoken");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db/db");
const app = express();

// Configuración del puerto
const port = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, "public", "uploads");

// Crea el directorio 'uploads' en la carpeta public si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configuración de Handlebars sin layout por defecto
app.engine(
  "hbs",
  exphbs.engine({
    extname: "hbs",
    defaultLayout: false, // No utilizar un layout por defecto
    layoutsDir: __dirname + "/views/",
  })
);
app.set("view engine", "hbs");

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static("public"));

// Ruta para servir archivos estáticos
app.use("/static", express.static(__dirname + "/src"));

// Rutas y lógica de tu aplicación
app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM skaters WHERE is_admin = FALSE AND email != 'admin@skatepark.com'"
    );
    res.render("home", { skaters: result.rows });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error al cargar los participantes");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/registrar", (req, res) => {
  res.render("register");
});

// Ruta para registrar un usuario
app.post("/register", async (req, res) => {
  const {
    nombre,
    email,
    password,
    repeatPassword,
    especialidad,
    anos_experiencia,
  } = req.body;

  const foto = req.files ? req.files.foto : null; // Accede al archivo subido

  if (password !== repeatPassword) {
    return res.status(400).send("Las contraseñas no coinciden");
  }

  try {
    if (!foto) {
      return res.status(400).send("Debe subir una foto");
    }

    // Guardar la imagen en algún lugar accesible
    const fileName = Date.now() + "-" + foto.name;
    foto.mv(path.join(uploadsDir, fileName));

    const result = await db.query(
      "INSERT INTO skaters (nombre, email, password, especialidad, anos_experiencia, foto) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [nombre, email, password, especialidad, anos_experiencia, fileName]
    );

    // Crear y firmar el token JWT
    const token = jwt.sign({ id: result.rows[0].id }, "secretKey");
    res.cookie("token", token);

    // Renderizar la vista de éxito
    res.render("success");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al registrar usuario");
  }
});

// Ruta para iniciar sesión
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM skaters WHERE email = $1 AND password = $2",
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).send("Credenciales incorrectas");
    }

    // Crear y firmar el token JWT
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      "secretKey"
    );
    res.cookie("token", token);

    // Verificar si el usuario es administrador
    if (email === "admin@skatepark.com") {
      res.redirect("/admin");
    } else {
      res.redirect("/perfil");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al iniciar sesión");
  }
});

// Ruta para cargar la vista de administrador
app.get("/admin", async (req, res) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(401).send("Acceso denegado. No se proporcionó token.");

  try {
    const decoded = jwt.verify(token, "secretKey");

    // Verificar si el usuario es administrador
    if (decoded.email !== "admin@skatepark.com") {
      return res.status(403).send("Acceso denegado. No eres administrador.");
    }

    const result = await db.query(
      "SELECT * FROM skaters WHERE email != 'admin@skatepark.com' AND is_admin = FALSE"
    );
    res.render("admin", { participants: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar la vista de administrador");
  }
});

// Ruta para aprobar un participante
app.get("/approve/:id", async (req, res) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(401).send("Acceso denegado. No se proporcionó token.");

  try {
    const decoded = jwt.verify(token, "secretKey");

    // Verificar si el usuario es administrador
    if (decoded.email !== "admin@skatepark.com") {
      return res.status(403).send("Acceso denegado. No eres administrador.");
    }

    await db.query("UPDATE skaters SET estado = 'aprobado' WHERE id = $1", [
      req.params.id,
    ]);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al aprobar participante");
  }
});

// Ruta para redirigir a la eliminación de un usuario
app.get("/delete/:id", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send("Acceso denegado. No se proporcionó token.");
  }

  try {
    const decoded = jwt.verify(token, "secretKey");

    // Verificar si el usuario es administrador
    if (decoded.email !== "admin@skatepark.com") {
      return res.status(403).send("Acceso denegado. No eres administrador.");
    }

    res.render("delete-confirm", { id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al redirigir a la eliminación");
  }
});

// Ruta para eliminar un usuario
app.post("/delete/:id", async (req, res) => {
  const userId = req.params.id;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send("Acceso denegado. No se proporcionó token.");
  }

  try {
    const decoded = jwt.verify(token, "secretKey");

    // Verificar si el usuario es administrador
    if (decoded.email !== "admin@skatepark.com") {
      return res.status(403).send("Acceso denegado. No eres administrador.");
    }

    // Eliminar el usuario
    await db.query("DELETE FROM skaters WHERE id = $1", [userId]);

    // Ajustar la secuencia del ID
    await db.query(`
      SELECT setval(pg_get_serial_sequence('skaters', 'id'), coalesce(max(id), 1), false) FROM skaters
    `);

    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al eliminar usuario");
  }
});

// Ruta para mostrar el perfil del usuario
app.get("/perfil", async (req, res) => {
  try {
    const token = req.cookies.token;

    // Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, "secretKey");

    // Obtener información del usuario desde la base de datos
    const result = await db.query(
      "SELECT nombre, email, especialidad, anos_experiencia, foto FROM skaters WHERE id = $1",
      [decoded.id]
    );

    // Verificar si el usuario fue encontrado
    if (result.rows.length === 0) {
      return res.status(404).send("Usuario no encontrado");
    }

    // Renderizar la plantilla perfil.hbs con los datos del usuario
    res.render("perfil", { skaters: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar perfil");
  }
});

// Ruta para cerrar sesión
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

// Ruta para modificar perfil
app.get("/edit", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).send("Acceso denegado. No se proporcionó token.");
    }

    const decoded = jwt.verify(token, "secretKey");
    const result = await db.query("SELECT * FROM skaters WHERE id = $1", [
      decoded.id,
    ]);

    res.render("edit", { skaters: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar el perfil para editar");
  }
});

// Ruta para actualizar perfil

app.post("/edit", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send("Acceso denegado. No se proporcionó token.");
  }

  try {
    const decoded = jwt.verify(token, "secretKey");
    const { nombre, password, especialidad, anos_experiencia } = req.body;

    await db.query(
      "UPDATE skaters SET nombre = $1, password = $2, especialidad = $3, anos_experiencia = $4 WHERE id = $5",
      [nombre, password, especialidad, anos_experiencia, decoded.id]
    );

    res.redirect("/perfil");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al modificar perfil");
  }
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
