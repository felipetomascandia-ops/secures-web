# Square Sandbox Local Testing Guide

## 1. Variables necesarias en `.env.local`

Agrega estas variables en tu `.env.local` en la raíz del proyecto:

- `SQUARE_ACCESS_TOKEN` - token de acceso de sandbox de Square.
- `NEXT_PUBLIC_SQUARE_LOCATION_ID` - location ID de Square sandbox.
- `SQUARE_WEBHOOK_SIGNATURE_KEY` - la clave secreta de firma de webhook Square.
- `SQUARE_ENVIRONMENT` - `sandbox` o `production` (para local debe ser `sandbox`).
- `NEXT_PUBLIC_BASE_URL` - URL base del sitio, por ejemplo `https://www.olimpocoveragegroup.com`.

Ejemplo:

```env
SQUARE_ACCESS_TOKEN=sandbox-sq0atb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SQUARE_LOCATION_ID=LR123ABC456DEF
SQUARE_WEBHOOK_SIGNATURE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SQUARE_ENVIRONMENT=sandbox
NEXT_PUBLIC_BASE_URL=https://www.olimpocoveragegroup.com
```

## 2. Cómo iniciar el proyecto

1. Instala dependencias si no está hecho:
   ```bash
   npm install
   ```
2. Ejecuta el proyecto en modo local:
   ```bash
   npm run dev
   ```
3. Asegúrate de que la app cargue en `https://www.olimpocoveragegroup.com`.

## 3. Endpoints a validar

### 3.1 Crear pago directo

Endpoint: `POST /api/payments/create`

Request body JSON esperado:

```json
{
  "nonce": "CARD_NONCE_FROM_FRONTEND",
  "name": "Juan Perez",
  "email": "juan@example.com",
  "phone": "+123456789",
  "amount": 10.50,
  "currency": "USD",
  "idempotencyKey": "unico-por-reintento-123"
}
```

Respuestas:
- `200` con `success: true` y `paymentId`, `status`, `receiptUrl`.
- `400` para invalidaciones de input.
- `402` si Square no completa el pago.
- `500` si hay error interno.

### 3.2 Crear checkout link

Endpoint: `POST /api/admin/payments/create-link`

Request body JSON esperado:

```json
{
  "customer": "Cliente prueba",
  "email": "cliente@example.com",
  "phone": "+123456789",
  "amount": 25.00,
  "currency": "USD",
  "description": "Pago de prueba",
  "contractId": "uuid-contrato-opcional",
  "expiresAt": "2026-12-31T23:59:59Z",
  "createdBy": "uuid-admin-opcional",
  "idempotencyKey": "reintento-checkout-123"
}
```

Respuestas:
- `200` con `success: true`, `checkoutId`, `checkoutUrl`, `data`.
- `400` si faltan campos obligatorios o monto inválido.
- `500` si hay error interno.

### 3.3 Webhook Square

Endpoint alias: `POST /api/webhooks/square`

También disponible en: `POST /api/square/webhook`

La ruta valida:
- `x-square-hmacsha256-signature`
- payload JSON
- tipo de evento permitido

Respuestas:
- `200` con `success: true` si se procesa o se ignora.
- `401` si falta firma o es inválida.
- `400` si el payload no es JSON.
- `500` si hay error interno.

## 4. Pruebas funcionales sugeridas

### 4.1 Probar crear un pago directo

1. Genera un `nonce` válido con Square Payments form/sandbox.
2. Envía `POST /api/payments/create` con el body anterior.
3. Valida que la respuesta tenga:
   - `success: true`
   - `paymentId`
   - `status` (debe ser `COMPLETED` si se pagó)
   - `receiptUrl` opcional
4. Reintenta con el mismo `idempotencyKey` para verificar que Square no duplica el cargo.

### 4.2 Probar crear un checkout link

1. Envía `POST /api/admin/payments/create-link`.
2. Verifica que el JSON devuelva `checkoutUrl`.
3. Abre el `checkoutUrl` en el navegador.
4. Completa el checkout sandbox.
5. Confirma que `payments` en la DB guarda `status: pending` inicialmente.

### 4.3 Probar webhook

1. Configura el webhook en el dashboard de Square apuntando a `https://www.olimpocoveragegroup.com/api/webhooks/square`.
2. Usa la clave `SQUARE_WEBHOOK_SIGNATURE_KEY` en Square.
3. Envía un evento `payment.updated` / `payment.created` desde Square.
4. Verifica en la consola o logs:
   - `Square webhook received`
   - `Processing Square webhook event`
   - `Webhook payment status updated`
5. Verifica la fila en `payments` se actualiza a `completed` o `failed` según el estado.

## 5. Reglas de estado implementadas

- `PENDING` no actualiza la orden como pagada.
- `COMPLETED` se mapea a `completed` en la tabla `payments`.
- `CANCELED` / `CANCELLED` / `FAILED` se mapean a `failed`.

## 6. Idempotencia

- `POST /api/payments/create` usa `idempotencyKey` generado automáticamente si no se provee.
- `POST /api/admin/payments/create-link` también lo usa.
- Para pruebas, envía el mismo `idempotencyKey` dos veces y valida que Square no duplique el recurso.

## 7. Logs seguros

- No se imprimen tokens ni secretos en los logs.
- Se registran claves relevantes:
  - `paymentId`
  - `status`
  - `eventType`
  - `checkoutId`
  - `webhook received`

## 8. Checklist de despliegue

- [ ] `.env.local` con variables de Square actualizadas.
- [ ] `SQUARE_ENVIRONMENT=sandbox` en pruebas locales.
- [ ] `NEXT_PUBLIC_BASE_URL` correcto.
- [ ] Webhook configurado en Square con la URL exacta.
- [ ] `npm run build` pasa.
- [ ] `npx tsc --noEmit` pasa.
- [ ] Probar `POST /api/payments/create` con `idempotencyKey`.
- [ ] Probar `POST /api/admin/payments/create-link` y completar checkout.
- [ ] Verificar los eventos webhook `payment.updated` y `payment.created`.
- [ ] Confirmar en DB que el estado de `payments` se actualiza correctamente.
- [ ] Revisar que ningún log contenga `SQUARE_ACCESS_TOKEN` o `SQUARE_WEBHOOK_SIGNATURE_KEY`.
