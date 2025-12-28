# Twitch Bits Equivalent Implementation

## Overview
Implement a Twitch bits equivalent system for Discord streaming with $1 = 100 bits exchange rate, separate from existing points system.

## Tasks

### 1. Create Bits Service
- [ ] Create `src/services/bits.ts` with functions for managing bits balance
- [ ] Implement addBits, getBits, setBits, getBitsLeaderboard functions
- [ ] Store bits data in separate JSON file (bits.json)

### 2. Discord Role Management
- [ ] Extend Discord service to manage bits role assignment/removal
- [ ] Add functions to assign/remove bits role based on balance
- [ ] Create bits emoji and configure permissions

### 3. PayPal Webhook Integration
- [ ] Create PayPal webhook endpoint in `src/app/api/paypal/webhook/route.ts`
- [ ] Handle payment confirmations and automatically add bits
- [ ] Validate webhook signatures for security

### 4. Cheer Commands
- [ ] Add !cheer[amount] commands to automation system
- [ ] Implement bit deduction and thank you messages
- [ ] Add !bits command to check balance
- [ ] Add !bitsleader command for leaderboard

### 5. Admin Commands
- [ ] Add !addbits command for manual bit addition
- [ ] Add !payout command for tracking payouts
- [ ] Implement permission checks for admin commands

### 6. Role Assignment Logic
- [ ] Create automatic role assignment when bits > 0
- [ ] Create automatic role removal when bits = 0
- [ ] Update role management on bit transactions

### 7. Testing and Integration
- [ ] Test all commands work correctly
- [ ] Verify role assignment/removal works
- [ ] Test PayPal webhook integration
- [ ] Update documentation
