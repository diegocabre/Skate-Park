# Skate Park Registration System

Este es un sistema de registro de participantes para un skatepark. Los participantes pueden registrarse, iniciar sesión, modificar sus datos, y un administrador puede aprobar o eliminar participantes.

## Tecnologías Utilizadas

- **Node.js**: Entorno de ejecución para JavaScript en el servidor.
- **Express**: Framework web para Node.js.
- **Handlebars**: Motor de plantillas para generar HTML dinámico.
- **PostgreSQL**: Sistema de gestión de bases de datos.
- **jsonwebtoken**: Para la autenticación basada en tokens JWT.
- **express-fileupload**: Para la carga de archivos.

## Configuración del Proyecto

### Requisitos Previos

- Node.js (v14 o superior)
- PostgreSQL

### Instalación

1. Clonar el repositorio:

    ```bash
    git clone https://github.com/tu-usuario/skate-park-registration.git
    cd skate-park-registration
    ```

2. Instalar las dependencias:

    ```bash
    npm install
    ```

3. Configurar la base de datos:

    - Crear una base de datos en PostgreSQL.
    - Crear las tablas necesarias ejecutando los siguientes comandos SQL:

      ```sql
      CREATE TABLE skaters (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          anos_experiencia INT NOT NULL,
          especialidad VARCHAR(255) NOT NULL,
          foto VARCHAR(255) NOT NULL,
          estado VARCHAR(255) DEFAULT 'revisión',
          is_admin BOOLEAN DEFAULT FALSE
      );
      ```

4. Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

    ```plaintext
    PORT=3000
    DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_de_tu_base_de_datos
    SECRET_KEY=secretKey
    ```

### Ejecución

1. Iniciar el servidor:

    ```bash
    npm start
    ```

2. Abrir un navegador y navegar a `http://localhost:3000` para ver la aplicación en funcionamiento.

## Rutas Principales

### Registro y Login

- `GET /register`: Muestra el formulario de registro.
- `POST /register`: Maneja el envío del formulario de registro.
- `GET /login`: Muestra el formulario de login.
- `POST /login`: Maneja el envío del formulario de login.

### Participantes

- `GET /`: Muestra todos los participantes registrados.
- `GET /profile`: Muestra el perfil del participante autenticado.
- `POST /profile`: Maneja la actualización de los datos del participante autenticado.

### Administrador

- `GET /admin`: Muestra la vista de administrador con todos los participantes registrados.
- `GET /approve/:id`: Aprueba a un participante.
- `GET /delete/:id`: Redirige a la vista de confirmación de eliminación.
- `POST /delete/:id`: Maneja la eliminación de un participante.

## Seguridad

- El sistema utiliza JSON Web Tokens (JWT) para la autenticación.
- Las rutas protegidas requieren un token JWT válido.

