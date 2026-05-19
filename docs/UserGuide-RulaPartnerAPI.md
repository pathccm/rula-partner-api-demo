# Rula Partner API — User Guide

## Overview

The Rula Partner API allows you to search for providers, create patients, book appointments, and retrieve or cancel appointments. All requests require a Bearer token obtained via OAuth 2.0.

---

## Base URL for the Staging environment

```text
https://api.prod.rula.com/edge/partner-scheduling-api-server-staging
```

---

## Authentication

All API calls require a Bearer token. Tokens expire after **1 hour** and must be refreshed.

**Request:**

```bash
curl --silent --request POST \
  --url https://login.rula.com/oauth/token \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --user '<client_id>:<client_secret>' \
  --data 'grant_type=client_credentials&audience=https://api.prod.rula.com/'
```

**Response:**

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use the `access_token` value in the `Authorization: Bearer <token>` header for all subsequent requests.

---

## Endpoints

### 1. List Insurances

Returns all insurance carriers accepted by Rula, optionally filtered by state.

- **Method:** `GET`
- **Path:** `/v1/insurances`
- **Auth scope:** `partner_api:insurances:read`

| Query Parameter    | Required | Description                   |
| ------------------ | -------- | ----------------------------- |
| `two_letter_state` | No       | Filter by state (e.g. `"CA"`) |

**Request:**

```bash
curl --silent --request GET \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/insurances' \
  --header 'Authorization: Bearer <token>' | jq
```

**Response:**

```json
{
  "insurances": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "carrier_display_name": "Aetna",
      "network_name": "aetna",
      "state": "CA",
      "coverage_type": "commercial"
    },
    {
      "id": "789a0123-b45c-67d8-e901-234567890abc",
      "carrier_display_name": "Anthem",
      "network_name": "anthem",
      "state": "CA",
      "coverage_type": "commercial"
    }
  ]
}
```

> **Note:** Use `id` (not `network_name`) when passing `insurance_id` to Create Patient. Use `network_name` when passing `insurance` to Search Providers.

---

### 2. Search Providers

Returns providers matching the given search criteria.

- **Method:** `POST`
- **Path:** `/v1/providers/search`
- **Auth scope:** `partner_api:providers:read`

**Required fields:** none (all are optional filters)

| Field                   | Type    | Description                                                                                                  |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `limit`                 | integer | Max results to return (1–50, default 50)                                                                     |
| `two_letter_state`      | string  | State the provider is credentialed in (e.g. `"CA"`)                                                          |
| `care_category`         | string  | `"therapy"` (default) or `"psychiatry"`                                                                      |
| `insurance`             | string  | Must match `network_name` from `/v1/insurances` (case-insensitive)                                           |
| `coverage_type`         | string  | `commercial`, `medicaid`, `medicare_advantage`, `medicare_ffs`, `HMO`, `eap`                                 |
| `gender`                | string  | Provider gender identity (e.g. `"Female"`)                                                                   |
| `race`                  | string  | Provider race/ethnicity (e.g. `"Asian"`)                                                                     |
| `language`              | string  | Language spoken by provider (e.g. `"Spanish"`)                                                               |
| `specialization`        | string  | Clinical specialization (e.g. `"Anxiety"`, `"Trauma and PTSD"`)                                              |
| `modality`              | string  | Therapeutic modality (e.g. `"Cognitive Behavioral (CBT)"`, `"EMDR"`)                                         |
| `willing_to_see`        | string  | Patient type: `adults`, `children`, `minors`, `preteen`, `individuals`, `couples`, `families`                |
| `location_type`         | string  | `"in_person"` or `"telemedicine"`                                                                            |
| `proximity`             | object  | `lat`, `long`, `max_miles` — find in-person providers near a location                                        |
| `availability`          | object  | Filter by weekly schedule (days + time ranges + time zone). Cannot be combined with `absolute_availability`. |
| `absolute_availability` | object  | Filter by specific date/time windows. Cannot be combined with `availability`.                                |

**Request:**

```bash
curl --silent --request POST \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/providers/search' \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "limit": 10,
    "two_letter_state": "CA",
    "care_category": "therapy",
    "insurance": "aetna",
    "coverage_type": "commercial"
  }' | jq
```

**Response:**

```json
{
  "providers": [
    {
      "id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
      "first_name": "Shawndra",
      "last_name": "Williams",
      "profile_image_url": "https://provider-headshots.s3.us-west-2.amazonaws.com/...",
      "profile_bio": "",
      "genders": ["Female"],
      "races": ["Black or African American"],
      "slot_start_time": "2026-03-02T15:00:00.000Z"
    }
  ]
}
```

> **Note:** `slot_start_time` is the provider's next available appointment slot.

---

### 3. Get Provider Slots

Returns available appointment slots for a specific provider.

- **Method:** `GET`
- **Path:** `/v1/providers/slots`
- **Auth scope:** `partner_api:providers:read`

| Query Parameter    | Required | Description                                                                                                                                                 |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider_uuid`    | Yes      | UUID of the provider                                                                                                                                        |
| `two_letter_state` | Yes      | State code (e.g. `"CA"`)                                                                                                                                    |
| `location_type`    | Yes      | One or more values: `telemedicine`, `in_person` (repeat param for multiple)                                                                                 |
| `start_time_range` | No       | Two-element array of ISO 8601 UTC datetimes `[start, end]`. Start cannot be less than 25 hours from now. Defaults to 25 hours from now through 28 days out. |

**Request:**

```bash
curl --silent --request GET \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/providers/slots?provider_uuid=fe6e1131-6fdd-4089-8c7f-b6eef7852f75&two_letter_state=CA&location_type=telemedicine&location_type=in_person' \
  --header 'Authorization: Bearer <token>' | jq
```

**Response:**

```json
{
  "slots": [
    {
      "provider_id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
      "duration_mins": 60,
      "location": "telemedicine",
      "series_type": "initial",
      "start_time_iso": "2026-03-02T15:00:00.000Z"
    },
    {
      "provider_id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
      "duration_mins": 60,
      "location": "telemedicine",
      "series_type": "initial",
      "start_time_iso": "2026-03-03T15:00:00.000Z"
    }
  ]
}
```

---

### 4. Create a Patient

Registers a new patient in the Rula system.

- **Method:** `POST`
- **Path:** `/v1/patients`
- **Auth scope:** `partner_api:patients:create`

**Required fields:**

| Field                | Type    | Description                                                            |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| `partner_patient_id` | string  | Your internal patient ID                                               |
| `first_name`         | string  | Patient's first name                                                   |
| `last_name`          | string  | Patient's last name                                                    |
| `phone_number`       | string  | SMS-capable phone number. Must match guardian's if patient is a minor. |
| `email`              | string  | Patient's email address. Must match guardian's if patient is a minor.  |
| `date_of_birth`      | string  | ISO date format (`YYYY-MM-DD`)                                         |
| `location`           | string  | Two-letter state the patient resides in                                |
| `care_types`         | array   | One or more of: `Individual`, `Couples`, `Family`, `Psychiatry`        |
| `is_eap_referral`    | boolean | Whether this is an EAP referral                                        |

**Optional fields:**

| Field                         | Type    | Description                                                                                                                                                         |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `insurance_id`                | string  | UUID of the insurance carrier from `GET /v1/insurances`. Required when `is_self_pay` is `false`.                                                                    |
| `subscriber_id`               | string  | Insurance subscriber/member ID. Required when `is_eap_referral` is `false` and `is_self_pay` is `false`.                                                            |
| `is_self_pay`                 | boolean | Whether the patient will pay out-of-pocket instead of using insurance. Defaults to `false`. When `true`, `insurance_id` is not required.                            |
| `sex_at_birth`                | string  | `"Female"` or `"Male"`                                                                                                                                              |
| `address`                     | object  | `street`, `apt_suite`, `city`, `state`, `zip_code`, `is_home_address`                                                                                               |
| `guardian`                    | object  | Required if patient is a minor: `first_name`, `last_name`, `email`, `phone_number`                                                                                  |
| `employee_assistance_program` | object  | Required if `is_eap_referral` is `true`: `authorization_number`, `number_of_authorized_sessions`, `authorized_session_expiry_date`, `upcoming_insurance` (optional) |

**Request:**

```bash
curl --silent --request POST \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/patients' \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "partner_patient_id": "test-patient-001",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone_number": "4155550123",
    "email": "jane.doe@example.com",
    "date_of_birth": "1990-06-15",
    "location": "CA",
    "insurance_id": "123e4567-e89b-12d3-a456-426614174000",
    "subscriber_id": "AET123456789",
    "sex_at_birth": "Female",
    "care_types": ["Individual"],
    "is_eap_referral": false,
    "address": {
      "is_home_address": true,
      "street": "123 Main St",
      "city": "Los Angeles",
      "state": "CA",
      "zip_code": "90001"
    }
  }' | jq
```

**Response:**

```json
{
  "patient_id": "e269987f-6509-4366-8e99-7ffb8d971d58",
  "partner_patient_id": "test-patient-001"
}
```

> **Note:** Save the `patient_id` — it is required when creating appointments.

---

### 5. Create an Appointment

Books an appointment slot for a patient with a provider.

- **Method:** `POST`
- **Path:** `/v1/appointments`
- **Auth scope:** `partner_api:appointments:create`

**Required fields:**

| Field                                  | Type          | Description                                                                               |
| -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `patient_id`                           | string (UUID) | Rula patient ID from the Create Patient response                                          |
| `provider_id`                          | string (UUID) | Provider UUID from the Search Providers response                                          |
| `appointment_slot`                     | string        | ISO 8601 UTC datetime of the slot (must match a `start_time_iso` from Get Provider Slots) |
| `appointment_details.is_virtual`       | boolean       | `true` for telemedicine, `false` for in-person                                            |
| `appointment_details.appointment_type` | string        | `Individual`, `Couples`, `Family`, `15 min Consult`, or `Psychiatry`                      |
| `appointment_details.two_letter_state` | string        | State where appointment takes place                                                       |

**Request:**

```bash
curl --silent --request POST \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/appointments' \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "patient_id": "e269987f-6509-4366-8e99-7ffb8d971d58",
    "provider_id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
    "appointment_slot": "2026-03-02T15:00:00.000Z",
    "appointment_details": {
      "is_virtual": true,
      "appointment_type": "Individual",
      "two_letter_state": "CA"
    }
  }' | jq
```

**Response:**

```json
{
  "appointment_id": "a3f8c210-7d4e-4b92-bf13-9e1d05c6f3a8",
  "status": "held"
}
```

> **Note:** `status` will be `"held"` initially. It transitions to `"confirmed"` once the appointment is fully confirmed.

---

### 6. Get an Appointment

Retrieves the current state of a single appointment by its UUID.

- **Method:** `GET`
- **Path:** `/v1/appointments/{uuid}`
- **Auth scope:** `partner_api:appointments:read`

| Path Parameter | Required | Description                                                |
| -------------- | -------- | ---------------------------------------------------------- |
| `uuid`         | Yes      | The Rula `appointment_id` returned from Create Appointment |

**Request:**

```bash
curl --silent --request GET \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/appointments/a3f8c210-7d4e-4b92-bf13-9e1d05c6f3a8' \
  --header 'Authorization: Bearer <token>' | jq
```

**Response:**

```json
{
  "appointment_id": "a3f8c210-7d4e-4b92-bf13-9e1d05c6f3a8",
  "provider_id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
  "start_time": "2026-03-02T15:00:00Z",
  "end_time": "2026-03-02T16:00:00Z",
  "status": "confirmed",
  "appointment_type": "telemedicine",
  "therapy_type": "individual"
}
```

---

### 7. Cancel an Appointment

Cancels an existing appointment.

- **Method:** `PUT`
- **Path:** `/v1/appointments/{uuid}/cancel`
- **Auth scope:** `partner_api:appointments:create`

| Path Parameter | Required | Description                                                |
| -------------- | -------- | ---------------------------------------------------------- |
| `uuid`         | Yes      | The Rula `appointment_id` returned from Create Appointment |

**Request body fields:**

| Field                      | Required | Description                                                              |
| -------------------------- | -------- | ------------------------------------------------------------------------ |
| `initiator`                | Yes      | Who initiated the cancellation. Currently only `"patient"` is supported. |
| `cancellation_reason_text` | Yes      | Freeform text describing the cancellation reason.                        |

**Request:**

```bash
curl --silent --request PUT \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/appointments/a3f8c210-7d4e-4b92-bf13-9e1d05c6f3a8/cancel' \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "initiator": "patient",
    "cancellation_reason_text": "Patient requested cancellation"
  }' | jq
```

**Response:**

```json
{
  "appointment_id": "a3f8c210-7d4e-4b92-bf13-9e1d05c6f3a8",
  "provider_id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
  "start_time": "2026-03-02T15:00:00Z",
  "end_time": "2026-03-02T16:00:00Z",
  "status": "canceled",
  "appointment_type": "telemedicine",
  "therapy_type": "individual"
}
```

---

### 8. Get Patient Appointments

Returns all appointments for a given patient, including their current status.

- **Method:** `GET`
- **Path:** `/v1/patients/{uuid}/appointments`
- **Auth scope:** `partner_api:appointments:read`

| Path Parameter | Required | Description                                        |
| -------------- | -------- | -------------------------------------------------- |
| `uuid`         | Yes      | The Rula `patient_id` returned from Create Patient |

**Request:**

```bash
curl --silent --request GET \
  --url 'https://api.prod.rula.com/edge/partner-scheduling-api-server-staging/v1/patients/e269987f-6509-4366-8e99-7ffb8d971d58/appointments' \
  --header 'Authorization: Bearer <token>' | jq
```

**Response:**

```json
{
  "appointments": [
    {
      "appointment_id": "a3f8c210-7d4e-4b92-bf13-9e1d05c6f3a8",
      "provider_id": "fe6e1131-6fdd-4089-8c7f-b6eef7852f75",
      "start_time": "2026-03-02T15:00:00Z",
      "end_time": "2026-03-02T16:00:00Z",
      "status": "confirmed",
      "appointment_type": "telemedicine",
      "therapy_type": "individual"
    }
  ]
}
```

---

## Typical Integration Flow

```text
1. Authenticate          → POST /oauth/token                      → get access_token
2. List insurances       → GET  /v1/insurances                    → get id and network_name values
3. Search providers      → POST /v1/providers/search              → get provider id
4. Get provider slots    → GET  /v1/providers/slots               → get available slot times
5. Create patient        → POST /v1/patients                      → get patient_id
6. Book appointment      → POST /v1/appointments                  → get appointment_id
7. Check status          → GET  /v1/appointments/{uuid}           → or GET /v1/patients/{id}/appointments
8. Cancel if needed      → PUT  /v1/appointments/{uuid}/cancel
```

---

## Error Responses

| HTTP Status | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| `400`       | Invalid request — check required fields and formats     |
| `401`       | Unauthorized — token is missing, invalid, or expired    |
| `403`       | Forbidden — token lacks required scope                  |
| `404`       | Not Found — resource does not exist                     |
| `406`       | Not Acceptable — slot is no longer available            |
| `409`       | Conflict — appointment already exists for this slot     |
| `422`       | Unprocessable Entity — business logic validation failed |
| `500`       | Internal Server Error                                   |

**Example 400 response:**

```json
{
  "message": "Invalid request",
  "errors": [
    {
      "field": "querystring.location_type",
      "message": "must have required property 'location_type'"
    }
  ]
}
```

---

## Tips

- **Token expiry:** Tokens expire after 1 hour. Re-authenticate before making calls if your token may have expired.
- **Slot matching:** The `appointment_slot` value passed to Create Appointment must exactly match a `start_time_iso` value returned from Get Provider Slots.
- **Insurance lookup:** Use the `id` field from List Insurances as `insurance_id` in Create Patient. Use the `network_name` field as `insurance` in Search Providers.
- **Self-pay patients:** Set `is_self_pay: true` to omit insurance fields for patients paying out-of-pocket.
