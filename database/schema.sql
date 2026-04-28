-- ============================================================
-- AgroRiego IoT — Schema SQL Server
-- Tecnólogico de Monterrey, Campus Chihuahua
-- ============================================================
-- Instrucciones para ejecutar:
--
--   Mac/Linux:
--   sqlcmd -S localhost -U sa -P TU_PASSWORD -i database/schema.sql
--
--   Windows (SSMS):
--   Abre SSMS, conéctate al servidor y ejecuta este archivo
-- ============================================================

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SistemaRiegoIoT')
BEGIN
    CREATE DATABASE SistemaRiegoIoT;
END
GO

USE SistemaRiegoIoT;
GO

-- ============================================================
-- 1. TABLA: Usuario
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Usuario' AND xtype='U')
CREATE TABLE Usuario (
                         id_usuario          INT IDENTITY(1,1) PRIMARY KEY,
                         email               VARCHAR(100)    NOT NULL UNIQUE,
                         password_hash       VARCHAR(255)    NOT NULL,
                         nombre_completo     VARCHAR(100)    NOT NULL,
                         rfc                 VARCHAR(13)     NULL,
                         fecha_nacimiento    DATE            NULL,
                         rol                 VARCHAR(30)     NOT NULL,
                         activo              BIT             NOT NULL DEFAULT 0,
                         foto_perfil_url     VARCHAR(255)    NULL,
                         CONSTRAINT chk_rol CHECK (rol IN ('Administrador Sistema', 'Administrador Predio', 'Operador Campo'))
);
GO

-- Migraciones para bases de datos existentes
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuario') AND name = 'telefono')
    ALTER TABLE Usuario DROP COLUMN telefono;
GO
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuario') AND name = 'sms_codigo')
    ALTER TABLE Usuario DROP COLUMN sms_codigo;
GO
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuario') AND name = 'sms_codigo_expira')
    ALTER TABLE Usuario DROP COLUMN sms_codigo_expira;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuario') AND name = 'rfc')
    ALTER TABLE Usuario ADD rfc VARCHAR(13) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuario') AND name = 'fecha_nacimiento')
    ALTER TABLE Usuario ADD fecha_nacimiento DATE NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuario') AND name = 'foto_perfil_url')
    ALTER TABLE Usuario ADD foto_perfil_url VARCHAR(255) NULL;
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PerfilCliente') AND name = 'telefono_contacto')
    ALTER TABLE PerfilCliente DROP COLUMN telefono_contacto;
GO

-- ============================================================
-- 2. TABLA: PerfilCliente (solo para Administradores de Predio)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PerfilCliente' AND xtype='U')
CREATE TABLE PerfilCliente (
                               id_perfil               INT IDENTITY(1,1) PRIMARY KEY,
                               id_usuario              INT             NOT NULL UNIQUE,
                               nombre_cliente_empresa  VARCHAR(150)    NOT NULL,
                               rfc                     VARCHAR(13)     NULL UNIQUE,
                               email_contacto          VARCHAR(100)    NULL,
                               CONSTRAINT fk_perfil_usuario FOREIGN KEY (id_usuario)
                                   REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);
GO

-- ============================================================
-- 3. TABLA: Predio
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConfiguracionGeneral' AND xtype='U')
CREATE TABLE ConfiguracionGeneral (
    id_configuracion                 INT IDENTITY(1,1) PRIMARY KEY,
    frecuencia_actualizacion_min     INT             NOT NULL DEFAULT 10,
    notificaciones_email             BIT             NOT NULL DEFAULT 1,
    email_notificaciones             VARCHAR(100)    NOT NULL DEFAULT 'admin@agroriego.com',
    nombre_cliente                   VARCHAR(150)    NOT NULL DEFAULT 'AgroRiego Mexico S.A. de C.V.',
    rfc                              VARCHAR(13)     NULL,
    email_contacto                   VARCHAR(100)    NULL,
    actualizado_en                   DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT 1 FROM ConfiguracionGeneral)
INSERT INTO ConfiguracionGeneral (
    frecuencia_actualizacion_min,
    notificaciones_email,
    email_notificaciones,
    nombre_cliente,
    rfc,
    email_contacto
) VALUES (
    10,
    1,
    'admin@agroriego.com',
    'AgroRiego Mexico S.A. de C.V.',
    'ARM123456ABC',
    'contacto@agroriego.com'
);
GO

-- ============================================================
-- 4. TABLA: Predio
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Predio' AND xtype='U')
CREATE TABLE Predio (
                        id_predio   INT IDENTITY(1,1) PRIMARY KEY,
                        id_usuario  INT             NOT NULL,
                        nombre      VARCHAR(100)    NOT NULL,
                        latitud     DECIMAL(10, 8)  NOT NULL,
                        longitud    DECIMAL(11, 8)  NOT NULL,
                        CONSTRAINT fk_predio_usuario FOREIGN KEY (id_usuario)
                            REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);
GO

-- ============================================================
-- 4. TABLA: AreaRiego
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AreaRiego' AND xtype='U')
CREATE TABLE AreaRiego (
                           id_area             VARCHAR(50)     NOT NULL PRIMARY KEY,
                           id_predio           INT             NOT NULL,
                           nombre              VARCHAR(100)    NOT NULL,
                           tipo_cultivo        VARCHAR(30)     NOT NULL,
                           tipo_tierra         VARCHAR(50)     NOT NULL,
                           tamano_hectareas    DECIMAL(8, 2)   NOT NULL,
                           capacidad_campo     DECIMAL(5, 2)   NOT NULL, -- Umbral Máximo %
                           punto_marchitez     DECIMAL(5, 2)   NOT NULL, -- Umbral Mínimo %
                           estatus_activo      BIT             DEFAULT 1, -- 1=Activa, 0=Inactiva
                           CONSTRAINT fk_area_predio FOREIGN KEY (id_predio)
                               REFERENCES Predio(id_predio) ON DELETE CASCADE,
                           CONSTRAINT chk_cultivo CHECK (tipo_cultivo IN ('Nogal', 'Manzana', 'Alfalfa', 'Maíz', 'Chile', 'Algodón'))
);
GO

-- ============================================================
-- 5. TABLA: LecturaTelemetria
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LecturaTelemetria' AND xtype='U')
CREATE TABLE LecturaTelemetria (
                                   id_lectura              BIGINT IDENTITY(1,1) PRIMARY KEY,
                                   id_area                 VARCHAR(50)     NOT NULL,
                                   fecha_hora              DATETIME        NOT NULL,

    -- Variables Suelo
                                   humedad_suelo           DECIMAL(5, 2)   NOT NULL,
                                   potencial_hidrico       DECIMAL(8, 2)   NOT NULL,
                                   electroconductividad    DECIMAL(8, 2)   NOT NULL,
                                   temperatura_suelo       DECIMAL(5, 2)   NOT NULL,
                                   ndvi                    DECIMAL(4, 3)   NULL,

    -- Variables Riego
                                   estatus_riego           BIT             NOT NULL,
                                   flujo_riego             DECIMAL(8, 2)   NOT NULL,

    -- Variables Ambientales
                                   temperatura_ambiental   DECIMAL(5, 2)   NOT NULL,
                                   humedad_relativa        DECIMAL(5, 2)   NOT NULL,
                                   velocidad_viento        DECIMAL(6, 2)   NOT NULL,
                                   radiacion_solar         DECIMAL(8, 2)   NOT NULL,
                                   evapotranspiracion      DECIMAL(6, 2)   NOT NULL,

                                   CONSTRAINT fk_lectura_area FOREIGN KEY (id_area)
                                       REFERENCES AreaRiego(id_area) ON DELETE CASCADE
);
GO

-- Índice para acelerar consultas por área y fecha en el Dashboard
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_area_fecha')
CREATE NONCLUSTERED INDEX idx_area_fecha
ON LecturaTelemetria (id_area, fecha_hora);
GO

-- ============================================================
-- 6. TABLA: Alerta
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConsumoAgua' AND xtype='U')
CREATE TABLE ConsumoAgua (
                            id_consumo           BIGINT IDENTITY(1,1) PRIMARY KEY,
                            id_area              VARCHAR(50)     NOT NULL,
                            fecha_hora           DATETIME        NOT NULL,
                            consumo_m3           DECIMAL(10, 2)  NOT NULL,
                            CONSTRAINT fk_consumo_area FOREIGN KEY (id_area)
                                REFERENCES AreaRiego(id_area) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_consumo_fecha')
CREATE NONCLUSTERED INDEX idx_consumo_fecha
ON ConsumoAgua (fecha_hora, id_area);
GO

-- Datos de consumo de agua para evitar que la tabla quede vacía
IF NOT EXISTS (SELECT TOP 1 * FROM ConsumoAgua)
INSERT INTO ConsumoAgua (id_area, fecha_hora, consumo_m3) VALUES
    ('AR-001', DATEADD(HOUR,   -5, GETDATE()), 2.40),
    ('AR-001', DATEADD(HOUR,   -4, GETDATE()), 2.15),
    ('AR-002', DATEADD(HOUR,   -5, GETDATE()), 1.80),
    ('AR-002', DATEADD(HOUR,   -3, GETDATE()), 1.95),
    ('AR-003', DATEADD(HOUR,   -4, GETDATE()), 1.25),
    ('AR-003', DATEADD(HOUR,   -2, GETDATE()), 1.40),
    ('AR-004', DATEADD(HOUR,   -6, GETDATE()), 3.10),
    ('AR-004', DATEADD(HOUR,   -1, GETDATE()), 2.85),
    ('AR-005', DATEADD(HOUR,   -5, GETDATE()), 0.95),
    ('AR-005', DATEADD(HOUR,   -1, GETDATE()), 1.05);
GO

-- ============================================================
-- 7. TABLA: Alerta
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Alerta' AND xtype='U')
CREATE TABLE Alerta (
                        id_alerta           BIGINT IDENTITY(1,1) PRIMARY KEY,
                        id_area             VARCHAR(50)     NOT NULL,
                        id_lectura          BIGINT          NULL,
                        fecha_generacion    DATETIME        NOT NULL,
                        tipo_alerta         VARCHAR(50)     NOT NULL,
                        severidad           VARCHAR(20)     NOT NULL,
                        mensaje             VARCHAR(255)    NOT NULL,
                        leida               BIT             DEFAULT 0, -- 0=No leída, 1=Leída
                        fecha_lectura       DATETIME        NULL,

                        CONSTRAINT fk_alerta_area FOREIGN KEY (id_area)
                            REFERENCES AreaRiego(id_area) ON DELETE CASCADE,
                        CONSTRAINT fk_alerta_lectura FOREIGN KEY (id_lectura)
                            REFERENCES LecturaTelemetria(id_lectura) ON DELETE NO ACTION,
                        CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('Estrés Hídrico', 'Saturación', 'Falla de Calibración')),
                        CONSTRAINT chk_severidad CHECK (severidad IN ('Crítica', 'Advertencia', 'Informativa'))
);
GO

-- ============================================================
-- 8. TABLA: Auditoria
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Auditoria' AND xtype='U')
CREATE TABLE Auditoria (
                           id_log              BIGINT IDENTITY(1,1) PRIMARY KEY,
                           id_usuario          INT             NOT NULL,
                           fecha_hora          DATETIME        DEFAULT GETDATE() NOT NULL,
                           accion_realizada    VARCHAR(255)    NOT NULL,
                           CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
                               REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);
GO

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Usuarios
-- Passwords demo hasheadas con bcrypt para ser compatibles con /auth/login.
IF NOT EXISTS (SELECT * FROM Usuario WHERE email = 'admin@agroriego.mx')
INSERT INTO Usuario (email, password_hash, nombre_completo, rol, activo) VALUES
    ('admin@agroriego.mx', '$2b$10$QNNeIaN83UPKB5h0m0RkOugckT6p1CHU6mMJeZ88cddF9.Yaq3ed.', 'Administrador General', 'Administrador Sistema', 1);

IF NOT EXISTS (SELECT * FROM Usuario WHERE email = 'predio@agroriego.mx')
INSERT INTO Usuario (email, password_hash, nombre_completo, rol, activo) VALUES
    ('predio@agroriego.mx', '$2b$10$OUiyk5fv/qC9QuJG7lYUmeJM900eio.sIbNEZvW1c0Blz4LDer0RK', 'Juan García', 'Administrador Predio', 1);

IF NOT EXISTS (SELECT * FROM Usuario WHERE email = 'operador@agroriego.mx')
INSERT INTO Usuario (email, password_hash, nombre_completo, rol, activo) VALUES
    ('operador@agroriego.mx', '$2b$10$pUvqRb46l1kaqqqaMS/XLewYCyGMMJLfITHFmIfAluiA8WcqrZ40S', 'María López', 'Operador Campo', 1);

UPDATE Usuario
SET password_hash = '$2b$10$QNNeIaN83UPKB5h0m0RkOugckT6p1CHU6mMJeZ88cddF9.Yaq3ed.',
    nombre_completo = 'Administrador General',
    rol = 'Administrador Sistema',
    activo = 1
WHERE email = 'admin@agroriego.mx'
  AND (password_hash NOT LIKE '$2%' OR activo <> 1 OR rol <> 'Administrador Sistema');

UPDATE Usuario
SET password_hash = '$2b$10$OUiyk5fv/qC9QuJG7lYUmeJM900eio.sIbNEZvW1c0Blz4LDer0RK',
    nombre_completo = 'Juan García',
    rol = 'Administrador Predio',
    activo = 1
WHERE email = 'predio@agroriego.mx'
  AND (password_hash NOT LIKE '$2%' OR activo <> 1 OR rol <> 'Administrador Predio');

UPDATE Usuario
SET password_hash = '$2b$10$pUvqRb46l1kaqqqaMS/XLewYCyGMMJLfITHFmIfAluiA8WcqrZ40S',
    nombre_completo = 'María López',
    rol = 'Operador Campo',
    activo = 1
WHERE email = 'operador@agroriego.mx'
  AND (password_hash NOT LIKE '$2%' OR activo <> 1 OR rol <> 'Operador Campo');
GO

-- Predios
IF NOT EXISTS (SELECT * FROM Predio WHERE nombre = 'Predio Norte')
INSERT INTO Predio (id_usuario, nombre, latitud, longitud) VALUES
    (2, 'Predio Norte', 28.68842920, -106.08123870),
    (2, 'Predio Sur',   28.68112920, -106.07223870);
GO

UPDATE Predio
SET latitud = 28.68842920,
    longitud = -106.08123870
WHERE nombre = 'Predio Norte';
GO

UPDATE Predio
SET latitud = 28.68112920,
    longitud = -106.07223870
WHERE nombre = 'Predio Sur';
GO

-- Áreas de riego
IF NOT EXISTS (SELECT * FROM AreaRiego WHERE id_area = 'AR-001')
INSERT INTO AreaRiego (id_area, id_predio, nombre, tipo_cultivo, tipo_tierra, tamano_hectareas, capacidad_campo, punto_marchitez) VALUES
    ('AR-001', 1, 'Zona Nogal A1',   'Nogal',   'Franco Arcilloso', 5.50, 38.00, 14.00),
    ('AR-002', 1, 'Zona Manzana B1', 'Manzana', 'Franco Arenoso',   3.20, 32.00, 11.00),
    ('AR-003', 1, 'Zona Alfalfa C1', 'Alfalfa', 'Franco',           4.80, 35.00, 13.00),
    ('AR-004', 2, 'Zona Maíz D1',    'Maíz',    'Arcilloso',        6.00, 40.00, 16.00),
    ('AR-005', 2, 'Zona Chile E1',   'Chile',   'Franco Limoso',    2.50, 30.00, 10.00);
GO

-- Lecturas de telemetría
IF NOT EXISTS (SELECT TOP 1 * FROM LecturaTelemetria)
INSERT INTO LecturaTelemetria (id_area, fecha_hora, humedad_suelo, potencial_hidrico, electroconductividad, temperatura_suelo, ndvi, estatus_riego, flujo_riego, temperatura_ambiental, humedad_relativa, velocidad_viento, radiacion_solar, evapotranspiracion) VALUES
    ('AR-001', DATEADD(MINUTE, -40, GETDATE()), 25.50, -0.035, 1.20, 22.50, 0.720, 1, 12.50, 27.00, 45.00,  8.50, 650.00, 4.20),
    ('AR-001', DATEADD(MINUTE, -30, GETDATE()), 25.20, -0.038, 1.21, 22.80, 0.718, 1, 12.30, 27.20, 44.50,  8.80, 660.00, 4.25),
    ('AR-001', DATEADD(MINUTE, -20, GETDATE()), 25.40, -0.036, 1.19, 22.60, 0.722, 1, 12.40, 27.10, 45.20,  8.60, 655.00, 4.22),
    ('AR-001', DATEADD(MINUTE, -10, GETDATE()), 25.50, -0.035, 1.20, 22.50, 0.720, 1, 12.50, 27.00, 45.00,  8.50, 650.00, 4.20),
    ('AR-002', DATEADD(MINUTE, -40, GETDATE()), 12.30, -0.180, 1.45, 24.00, 0.450, 0,  0.00, 29.00, 38.00, 12.00, 720.00, 5.10),
    ('AR-002', DATEADD(MINUTE, -30, GETDATE()), 12.10, -0.190, 1.46, 24.20, 0.445, 0,  0.00, 29.20, 37.50, 12.20, 725.00, 5.15),
    ('AR-002', DATEADD(MINUTE, -20, GETDATE()), 11.90, -0.200, 1.47, 24.40, 0.440, 0,  0.00, 29.40, 37.00, 12.40, 730.00, 5.20),
    ('AR-002', DATEADD(MINUTE, -10, GETDATE()), 11.80, -0.210, 1.48, 24.50, 0.438, 0,  0.00, 29.50, 36.80, 12.50, 732.00, 5.22),
    ('AR-003', DATEADD(MINUTE, -40, GETDATE()), 28.00, -0.025, 1.10, 21.00, 0.810, 1,  8.20, 26.00, 50.00,  7.00, 600.00, 3.80),
    ('AR-003', DATEADD(MINUTE, -10, GETDATE()), 28.20, -0.024, 1.09, 21.10, 0.812, 1,  8.30, 25.90, 50.50,  6.90, 598.00, 3.78),
    ('AR-004', DATEADD(MINUTE, -40, GETDATE()), 42.00, -0.008, 1.80, 23.00, 0.650, 1, 18.70, 25.00, 60.00,  5.00, 580.00, 3.50),
    ('AR-004', DATEADD(MINUTE, -10, GETDATE()), 42.50, -0.007, 1.82, 23.10, 0.648, 1, 19.00, 24.90, 60.50,  4.90, 578.00, 3.48),
    ('AR-005', DATEADD(MINUTE, -40, GETDATE()), 22.00, -0.055, 1.30, 23.50, 0.580, 1,  5.00, 28.00, 42.00,  9.00, 680.00, 4.50),
    ('AR-005', DATEADD(MINUTE, -10, GETDATE()), 22.00, -0.055, 1.30, 23.50, 0.580, 1,  5.00, 28.00, 42.00,  9.00, 680.00, 4.50);
GO

-- Alertas
IF NOT EXISTS (SELECT TOP 1 * FROM Alerta)
INSERT INTO Alerta (id_area, fecha_generacion, tipo_alerta, severidad, mensaje, leida) VALUES
    ('AR-002', DATEADD(MINUTE, -10, GETDATE()), 'Estrés Hídrico',      'Crítica',     'Humedad del suelo por debajo del punto de marchitez (11.80%). Riego urgente requerido.', 0),
    ('AR-004', DATEADD(MINUTE, -10, GETDATE()), 'Saturación',          'Advertencia', 'Humedad del suelo cerca de la capacidad de campo (42.50%). Revisar sistema de riego.',    0),
    ('AR-005', DATEADD(HOUR,   -2,  GETDATE()), 'Falla de Calibración', 'Informativa', 'El sensor de AR-005 presenta lecturas inconsistentes. Verificar calibración.',            1);
GO

-- Auditoría
IF NOT EXISTS (SELECT TOP 1 * FROM Auditoria)
INSERT INTO Auditoria (id_usuario, accion_realizada) VALUES
    (1, 'Inicio de sesión exitoso'),
    (1, 'Creación de predio: Predio Norte'),
    (2, 'Inicio de sesión exitoso');
GO

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 'Usuario'           AS Tabla, COUNT(*) AS Registros FROM Usuario             UNION ALL
SELECT 'PerfilCliente'     AS Tabla, COUNT(*) AS Registros FROM PerfilCliente        UNION ALL
SELECT 'Predio'            AS Tabla, COUNT(*) AS Registros FROM Predio               UNION ALL
SELECT 'AreaRiego'         AS Tabla, COUNT(*) AS Registros FROM AreaRiego            UNION ALL
SELECT 'LecturaTelemetria' AS Tabla, COUNT(*) AS Registros FROM LecturaTelemetria    UNION ALL
SELECT 'ConsumoAgua'       AS Tabla, COUNT(*) AS Registros FROM ConsumoAgua          UNION ALL
SELECT 'Alerta'            AS Tabla, COUNT(*) AS Registros FROM Alerta               UNION ALL
SELECT 'Auditoria'         AS Tabla, COUNT(*) AS Registros FROM Auditoria;
GO

PRINT '✓ Base de datos SistemaRiegoIoT creada exitosamente.';
GO