# Sample Management API Documentation

## Overview

Secure API for managing Y-STR DNA samples with API key authentication and complete audit logging.

**Features:**
- ✅ API key-based authentication
- ✅ Granular permissions system
- ✅ Complete audit trail with IP tracking
- ✅ CRUD operations for samples
- ✅ Bulk import support
- ✅ Automatic conflict resolution (newer overwrites older)

---

## Authentication

### Master API Key (Administrator Only)

Set in `.env`:
```bash
MASTER_API_KEY=your_super_secret_master_key
```

Used for:
- Creating/managing API keys
- Viewing audit logs
- Administrative operations

### User API Keys

Created by administrator, have specific permissions:
- `samples.create` - Create or update samples
- `samples.update` - Update existing samples
- `samples.delete` - Delete samples

---

## API Endpoints

### Sample Management (`/api/samples`)

#### **POST /api/samples** - Create or Update Sample
**Requires:** API key with `samples.create` permission

**Headers:**
```
X-API-Key: your_api_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "kitNumber": "55520",
  "name": "Pizhinov",
  "country": "Circassia",
  "haplogroup": "J-Y94477",
  "markers": {
    "DYS393": "12",
    "DYS390": "22",
    "DYS19": "15",
    "DYS391": "10"
  }
}
```

**Response:**
```json
{
  "success": true,
  "action": "created",
  "sample": {
    "kitNumber": "55520",
    "name": "Pizhinov",
    "country": "Circassia",
    "haplogroup": "J-Y94477",
    "markers": { ... },
    "createdAt": "2025-10-08T03:30:15.900Z",
    "updatedAt": "2025-10-08T03:30:15.900Z"
  }
}
```

---

#### **PUT /api/samples/:kitNumber** - Update Existing Sample
**Requires:** API key with `samples.update` permission

**Request Body:** (partial update supported)
```json
{
  "name": "Updated Name",
  "haplogroup": "J-Y94478"
}
```

---

#### **DELETE /api/samples/:kitNumber** - Delete Sample
**Requires:** API key with `samples.delete` permission

**Response:**
```json
{
  "success": true,
  "action": "deleted",
  "kitNumber": "55520"
}
```

---

#### **GET /api/samples/:kitNumber** - Get Sample (Public)
**No authentication required**

**Response:**
```json
{
  "success": true,
  "sample": {
    "kitNumber": "55520",
    "name": "Pizhinov",
    ...
  }
}
```

---

### API Key Management (`/api/admin/keys`)

#### **POST /api/admin/keys** - Create API Key
**Requires:** Master API key

**Request:**
```json
{
  "name": "Research Team Key",
  "description": "Key for research team sample uploads",
  "permissions": {
    "samples.create": true,
    "samples.update": true,
    "samples.delete": false
  },
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key created successfully. Save the key securely - it will not be shown again.",
  "apiKey": "c1343595801aa6c0189a7b6bdd521a08...",
  "keyInfo": {
    "id": 2,
    "name": "Research Team Key",
    "permissions": { ... },
    "expiresAt": "2026-10-08T00:00:00.000Z"
  }
}
```

⚠️ **Important:** API key is shown only once! Save it securely.

---

#### **GET /api/admin/keys** - List All API Keys
**Requires:** Master API key

**Query Parameters:**
- `includeInactive` - Include inactive keys (default: false)

---

#### **PUT /api/admin/keys/:id** - Update API Key
**Requires:** Master API key

Can update: name, description, permissions, isActive, expiresInDays

---

#### **DELETE /api/admin/keys/:id** - Delete/Deactivate API Key
**Requires:** Master API key

**Query Parameters:**
- `permanent=true` - Permanently delete (default: deactivate)

---

### Audit Log (`/api/admin/audit`)

#### **GET /api/admin/audit** - Get Audit Entries
**Requires:** Master API key

**Query Parameters:**
- `apiKeyId` - Filter by API key ID
- `operation` - Filter by operation (CREATE, UPDATE, DELETE)
- `tableName` - Filter by table name
- `recordId` - Filter by record ID
- `successOnly` - Show only successful operations
- `limit` - Max results (1-1000, default: 100)
- `offset` - Pagination offset
- `startDate` - Filter from date (ISO format)
- `endDate` - Filter to date (ISO format)

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "id": 3,
      "created_at": "2025-10-08T03:30:15.906Z",
      "operation": "CREATE",
      "table_name": "ystr_profiles",
      "record_id": "55520",
      "old_data": null,
      "new_data": { ... },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "success": true,
      "api_key_name": "Research Team Key"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### **GET /api/admin/audit/stats/summary** - Get Audit Statistics
**Requires:** Master API key

Returns statistics about operations, tables, activity, and top API keys.

---

#### **GET /api/admin/audit/export/csv** - Export Audit Log to CSV
**Requires:** Master API key

**Query Parameters:**
- `startDate` - Export from date
- `endDate` - Export to date

Downloads CSV file with audit entries.

---

## Sample Manager UI

Access at: `http://localhost:3000/samples`

### Features:

#### 1. **Add Individual Sample**
- Fill in kit number, name, country, haplogroup
- Enter STR markers manually
- Click "Add Sample"

#### 2. **Edit Existing Sample**
- Enter kit number to load
- Modify any fields
- Click "Update Sample"

#### 3. **Delete Sample**
- In Edit mode, click the red "Delete" button
- Confirm the action in the popup dialog
- **Warning**: This action cannot be undone

#### 4. **Bulk Import**

**From Clipboard:**
1. Copy data from Excel with headers
2. Paste into text area
3. Click "Parse Data"
4. Review parsed samples
5. Click "Upload X Samples"

**From CSV File:**
1. Click "Choose File"
2. Select CSV file
3. Click "Parse Data"
4. Click "Upload X Samples"

**Supported Column Names:**
- Kit Number: `kitNumber`, `kit_number`, `Kit Number`, `KitNumber`
- Name: `name`, `Name`, `Full Name`, `fullname`
- Country: `country`, `Country`, `location`, `Location`
- Haplogroup: `haplogroup`, `Haplogroup`, `FTDNA HG`, `Yfull`
- Markers: Any column starting with `DYS`, `Y-`, or `CDY`

---

## Database Schema

### `api_keys` Table
```sql
- id: Serial primary key
- key_hash: SHA-256 hash of API key
- name: Key name
- permissions: JSONB with permission flags
- created_at: Creation timestamp
- expires_at: Expiration timestamp (nullable)
- is_active: Active status
- last_used_at: Last usage timestamp
- usage_count: Number of times used
```

### `audit_log` Table
```sql
- id: Serial primary key
- api_key_id: Reference to api_keys
- operation: CREATE, UPDATE, DELETE, DEACTIVATE
- table_name: Affected table
- record_id: Affected record identifier
- old_data: JSONB snapshot before change
- new_data: JSONB snapshot after change
- ip_address: Client IP address
- user_agent: Client user agent
- success: Operation success flag
- error_message: Error message (if failed)
- created_at: Timestamp
```

---

## Security Best Practices

### 1. **Protect Master Key**
- Never commit to version control
- Store in environment variables only
- Rotate periodically

### 2. **API Key Management**
- Use descriptive names
- Set appropriate permissions
- Set expiration dates when possible
- Deactivate unused keys

### 3. **Audit Review**
- Regularly review audit logs
- Monitor for suspicious activity
- Check failed operations

### 4. **Access Control**
- Give minimum necessary permissions
- Use separate keys for different teams/purposes
- Revoke access when no longer needed

---

## Testing with cURL

### Create API Key
```bash
curl -X POST http://localhost:9005/api/admin/keys \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MASTER_KEY" \
  -d '{
    "name": "Test Key",
    "permissions": {
      "samples.create": true,
      "samples.update": true
    }
  }'
```

### Add Sample
```bash
curl -X POST http://localhost:9005/api/samples \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "kitNumber": "TEST123",
    "name": "Test Sample",
    "haplogroup": "R-M269",
    "markers": {
      "DYS393": "13",
      "DYS390": "24"
    }
  }'
```

### View Audit Log
```bash
curl http://localhost:9005/api/admin/audit?limit=10 \
  -H "X-API-Key: YOUR_MASTER_KEY"
```

---

## Troubleshooting

### "Invalid API key"
- Check that key is active and not expired
- Verify key is correct (case-sensitive)
- Check that key has required permissions

### "Insufficient permissions"
- API key doesn't have required permission
- Use master key or request permission update

### Sample not updating
- Check that kit_number matches exactly
- Verify you have `samples.update` permission
- Check audit log for error details

### Bulk import fails
- Verify CSV has proper headers
- Check that kit numbers are valid
- Ensure at least one marker per sample
- Review parse results before uploading

---

## Current Statistics

**Database:** 313,945 profiles
**Sample 55520:** ✅ In database (verified)
**Audit System:** ✅ Operational
**API Keys:** ✅ Working

---

**Last Updated:** 2025-10-08
**Version:** 2.0
