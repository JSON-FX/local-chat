# Group Ownership Transfer - Test Plan

## Overview
Testing the new feature where group ownership is automatically transferred to the first member when the owner leaves the group.

## Test Scenarios

### Scenario 1: Owner leaves group with other members
1. **Setup:**
   - Create a group with User A as owner
   - Add User B as first member
   - Add User C as second member

2. **Action:**
   - User A (owner) leaves the group

3. **Expected Result:**
   - User B becomes the new owner (first member by join date)
   - User B gets admin role
   - Other members receive notification about ownership transfer
   - User A is removed from the group

### Scenario 2: Owner leaves group with only one other member
1. **Setup:**
   - Create a group with User A as owner
   - Add User B as only member

2. **Action:**
   - User A (owner) leaves the group

3. **Expected Result:**
   - User B becomes the new owner
   - User B gets admin role
   - Notification sent about ownership transfer

### Scenario 3: Owner leaves group with no other members
1. **Setup:**
   - Create a group with User A as owner
   - No other members in the group

2. **Action:**
   - User A (owner) leaves the group

3. **Expected Result:**
   - Group is automatically deleted
   - No ownership transfer occurs

### Scenario 4: Regular member leaves group
1. **Setup:**
   - Create a group with User A as owner
   - Add User B as member
   - Add User C as member

2. **Action:**
   - User B (member) leaves the group

3. **Expected Result:**
   - User A remains the owner
   - No ownership transfer occurs
   - User B is removed from the group

## UI Changes to Test

### Group Settings Dialog
- **For Owners:** Should show both "Delete Group" and "Leave Group" buttons
- **For Members:** Should show only "Leave Group" button

### Notifications
- All group members should receive notification when ownership is transferred
- Format: "Group ownership transferred from [former owner] to [new owner]"

### Socket Events
- `ownership_transferred` event should be emitted to all group members
- Contains former owner and new owner information

## API Testing

### Leave Group Endpoint: `POST /api/groups/{groupId}/leave`
- Should work for both owners and members
- Should return ownership transfer information when applicable
- Response format:
```json
{
  "success": true,
  "message": "Left group successfully. Ownership transferred to [username]",
  "data": {
    "ownershipTransferred": true,
    "newOwnerId": 123,
    "newOwnerUsername": "username"
  }
}
```

## Database Verification
After ownership transfer:
1. Check `groups` table: `created_by` should be updated to new owner's ID
2. Check `group_members` table: new owner should have `role = 'admin'`
3. Former owner should have `is_active = 0` in `group_members` 