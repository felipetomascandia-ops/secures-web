# Database Analysis for Olimpo Coverage Group

## Objective
This document analyzes the current Supabase-related structure in the project and maps it to the insurance business model:

- Contracts = insurance policies/contracts
- Certificates = official documents delivered to insured clients
- Payments = premiums/instalments
- Users = clients/insured persons

The goal is to avoid duplicating tables and to prepare the architecture for:

Client -> Policy/Contract -> Documents -> Certificates -> Payments

---

## 1. Existing tables

### 1.1 user_profiles
Purpose:
- Stores public profile information for registered users.

Main columns:
- id
- user_id
- first_name
- last_name
- business_name
- phone
- address
- created_at
- updated_at

Current role:
- Used as the main identity/profile base for signed-in users.
- It is the natural place to attach the client identity for insurance operations.

Current capabilities:
- Stores basic contact information for users.
- Supports customer identification in the platform.

Missing for the insurance flow:
- No direct link to contracts/policies in a structured business way.
- No explicit customer status field.

---

### 1.2 admins
Purpose:
- Identifies administrators inside the system.

Main columns:
- id
- user_id
- first_name
- last_name
- email
- role
- created_at
- updated_at

Current role:
- Used by the admin shell to allow access to /admin.

Current capabilities:
- Supports admin access checks.

Missing for the insurance flow:
- Nothing essential for now; it is already sufficient for admin access.

---

### 1.3 contracts
Purpose:
- Stores insurance contracts/policies created by the admin.

Main columns:
- id
- contract_number
- contract_date
- client_name
- client_company_name
- client_email
- client_phone
- total_premium
- down_payment
- monthly_payment
- number_of_payments
- first_due_date
- last_due_date
- terms
- created_by
- created_at

Current role:
- Represents the core insurance policy/contract entity.

Current capabilities:
- Stores the contract information and payment terms.
- Used by the admin contract creation workflow.

Missing for the insurance flow:
- No direct relation to the authenticated client user.
- No policy status field.
- No document upload state.
- No certificate linkage.

---

### 1.4 payment_schedules
Purpose:
- Stores scheduled payments/instalments linked to a contract.

Main columns:
- id
- contract_id
- sequence
- label
- amount
- due_date
- status
- checkout_id
- checkout_url
- square_payment_id
- paid_at
- created_at

Current role:
- Represents premium payment instalments for a policy.

Current capabilities:
- Supports generation of pending/paid payments.
- Supports Square checkout generation.

Missing for the insurance flow:
- Better linkage to the customer view.
- Better status reporting for dashboard analytics.

---

### 1.5 square_payments
Purpose:
- Stores Square checkout/payment records tied to a payment schedule item.

Main columns:
- id
- schedule_id
- square_checkout_id
- square_payment_id
- receipt_url
- amount
- currency
- status
- created_at

Current role:
- Tracks the payment process created through Square.

Current capabilities:
- Captures Square checkout initiation and completion state.

Missing for the insurance flow:
- No explicit relationship to the customer account in a business-friendly way.
- No consolidated revenue summary logic beyond manual queries.

---

### 1.6 tickets
Purpose:
- Stores support requests from users.

Main columns:
- id
- created_at
- title
- description
- status
- priority
- user_id
- updated_at

Current role:
- Supports the admin support workflow.

Current capabilities:
- Tickets and ticket messages are already implemented.

Missing for the insurance flow:
- No direct relation to contracts or policy issues yet.

---

### 1.7 ticket_messages
Purpose:
- Stores messages inside a support ticket.

Main columns:
- id
- created_at
- ticket_id
- user_id
- message
- is_admin

Current role:
- Supports ticket conversation flow.

---

## 2. Relationships currently in use

Current relationships are mostly functional but not yet fully business-oriented:

- user_profiles.user_id -> auth.users.id
- admins.user_id -> auth.users.id
- contracts.created_by -> auth.users.id (admin creator)
- payment_schedules.contract_id -> contracts.id
- square_payments.schedule_id -> payment_schedules.id
- tickets.user_id -> auth.users.id
- ticket_messages.ticket_id -> tickets.id

This means the system already has the essential core pieces to represent:

- Customer identity
- Insurance contract
- Payment schedule
- Payment tracking

But it still lacks a clear operational layer for:

- client linked to policy
- signed document workflow
- official certificate issuance
- customer portal access

---

## 3. What the current system already supports

The current implementation already supports:

- Admin authentication through the admins table.
- Admin shell and admin routes.
- Contract creation by admin.
- Automatic payment schedule generation.
- Square checkout link creation.
- Payment status tracking.
- Ticket support workflow.

This is a solid base for a professional insurance platform.

---

## 4. What is still missing for the full business flow

To complete the full flow:

Customer -> Policy/Contract -> Documents -> Certificates -> Payments

The missing layers are:

### 4.1 Customer-policy linkage
- Contracts should be linked to the actual registered client user.
- The admin should be able to see which customer owns which policy.

### 4.2 Document workflow
- Signed contract copies should be uploaded and tracked.
- Status should move through: pending signature -> signed received -> approved.

### 4.3 Certificates
- Official insurance certificates should be generated and attached to the policy.
- The customer should be able to view and download them.

### 4.4 Customer portal data access
- The customer panel should load only the data belonging to the logged-in client.

### 4.5 Better business reporting
- Admin analytics should aggregate contracts, payments and customer status from real Supabase data.

---

## 5. Recommended database changes

No structural changes will be made yet. The following are the recommended changes for the next phase.

### 5.1 Recommended enhancement to contracts
Add columns that make the contract lifecycle more business realistic:

- user_id: owner of the policy/contract
- status: pending, active, signed, approved, cancelled
- policy_status: active, inactive, pending, cancelled
- signed_document_url
- certificate_url
- approved_at

### 5.2 Recommended new table: contract_documents
Purpose:
- Stores uploaded signed contract copies and policy documents.

Suggested columns:
- id
- contract_id
- document_type
- file_name
- file_url
- uploaded_by
- status
- created_at

### 5.3 Recommended new table: certificates
Purpose:
- Stores official certificates associated to a policy.

Suggested columns:
- id
- contract_id
- certificate_number
- issue_date
- valid_until
- file_url
- status
- created_at

These tables are compatible with the current model and do not duplicate the existing data structures.

---

## 6. SQL files to be created later

Per the instructions, any actual database change will be added as separate SQL files in the root of the project, for example:

- supabase_contract_documents.sql
- supabase_certificates.sql
- supabase_customer_panel.sql

Each file will include:
- CREATE TABLE if needed
- ALTER TABLE if needed
- relationships
- indexes
- RLS policies if required

No destructive changes will be included.

---

## 7. Current implementation status

The current codebase already supports the following:

- Admin panel shell
- Admin navigation structure
- Contract creation flow
- Payment schedule generation
- Square integration hooks
- Ticket support flow

The next logical step is to prepare the admin and customer data views using the existing tables and then introduce the missing schema extensions when the business flow requires them.

---

## 8. Recommended next step

The next implementation step should be:

1. Use the existing tables for admin customer and analytics views.
2. Keep the schema changes in a separate SQL migration file.
3. Only introduce the new tables when the customer document and certificate workflow is ready.
