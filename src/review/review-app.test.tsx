// Test for ReviewAppView rendering with example YAML data

import { afterEach, describe, expect, it } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { ReviewAppView } from "./review-app.tsx"
import { createHunk } from "./hunk-parser.ts"
import type { ReviewYaml } from "./types.ts"

// Example hunks using createHunk helper - generates valid rawDiff automatically
const exampleHunks = [
  createHunk(1, "src/utils.ts", 0, 10, 10, [
    " function helper() {",
    "-  return null",
    "+  // Add validation",
    "+  if (!input) return null",
    "+  return process(input)",
    " }",
  ]),
  createHunk(2, "src/utils.ts", 1, 25, 27, [
    " export function main() {",
    "+  const result = helper()",
    "+  console.log(result)",
    "   return result",
    " }",
  ]),
  createHunk(3, "src/index.ts", 0, 1, 1, [
    " import { main } from './utils'",
    "+import { logger } from './logger'",
  ]),
]

// Example review YAML that groups hunks with descriptions
const exampleReviewData: ReviewYaml = {
  hunks: [
    {
      hunkIds: [3],
      markdownDescription: `## Import changes

Added logger import to support new logging functionality.`,
    },
    {
      hunkIds: [1, 2],
      markdownDescription: `## Input validation and logging

These changes add input validation to the helper function and integrate logging in the main function.`,
    },
  ],
}

// Extended example with more hunks and richer prose
const extendedHunks = [
  // API endpoint changes
  createHunk(1, "src/api/users.ts", 0, 15, 15, [
    " export async function getUser(id: string) {",
    "-  const user = await db.users.find(id)",
    "-  return user",
    "+  const user = await db.users.find(id)",
    "+  if (!user) {",
    "+    throw new NotFoundError(`User ${id} not found`)",
    "+  }",
    "+  return sanitizeUser(user)",
    " }",
  ]),
  createHunk(2, "src/api/users.ts", 1, 35, 40, [
    " export async function updateUser(id: string, data: UserUpdate) {",
    "+  // Validate input before update",
    "+  validateUserUpdate(data)",
    "+  ",
    "   const user = await db.users.update(id, data)",
    "+  logger.info('User updated', { userId: id })",
    "   return user",
    " }",
  ]),
  // Configuration changes
  createHunk(3, "src/config/database.ts", 0, 1, 1, [
    " export const dbConfig = {",
    "-  host: 'localhost',",
    "-  port: 5432,",
    "+  host: process.env.DB_HOST || 'localhost',",
    "+  port: parseInt(process.env.DB_PORT || '5432'),",
    "+  ssl: process.env.NODE_ENV === 'production',",
    "   database: 'myapp',",
    " }",
  ]),
  // Error handling
  createHunk(4, "src/errors/index.ts", 0, 1, 1, [
    "+export class NotFoundError extends Error {",
    "+  constructor(message: string) {",
    "+    super(message)",
    "+    this.name = 'NotFoundError'",
    "+  }",
    "+}",
    "+",
    "+export class ValidationError extends Error {",
    "+  constructor(message: string, public field: string) {",
    "+    super(message)",
    "+    this.name = 'ValidationError'",
    "+  }",
    "+}",
  ]),
  // Test file
  createHunk(5, "src/api/users.test.ts", 0, 50, 50, [
    " describe('getUser', () => {",
    "+  it('should throw NotFoundError for missing user', async () => {",
    "+    await expect(getUser('invalid-id')).rejects.toThrow(NotFoundError)",
    "+  })",
    "+",
    "   it('should return user by id', async () => {",
    "     const user = await getUser('user-1')",
    "     expect(user.id).toBe('user-1')",
    "   })",
    " })",
  ]),
  // Migration file
  createHunk(6, "migrations/001_add_audit_fields.sql", 0, 1, 1, [
    "+-- Add audit fields to users table",
    "+ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();",
    "+ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();",
    "+ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;",
    "+",
    "+-- Create index for soft deletes",
    "+CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;",
  ]),
]

// Rich prose descriptions with multiple paragraphs and formatting
const extendedReviewData: ReviewYaml = {
  hunks: [
    {
      hunkIds: [4],
      markdownDescription: `## Custom Error Classes

Introduces two new error classes for better error handling across the application:

- **NotFoundError**: Used when a requested resource doesn't exist
- **ValidationError**: Used for input validation failures, includes the field name

These errors enable more specific catch blocks and better error messages for API consumers.`,
    },
    {
      hunkIds: [1, 2],
      markdownDescription: `## User API Improvements

### Error Handling
The getUser function now properly handles missing users by throwing a NotFoundError instead of returning null. This makes the API behavior more predictable.

### Security
User data is now sanitized before being returned to prevent leaking sensitive fields.

### Audit Logging
The updateUser function now logs all updates for audit purposes. This helps with debugging and compliance requirements.`,
    },
    {
      hunkIds: [3],
      markdownDescription: `## Environment-based Configuration

Database configuration now reads from environment variables with sensible defaults:

- DB_HOST: Database hostname (default: localhost)
- DB_PORT: Database port (default: 5432)  
- SSL is automatically enabled in production

This change enables proper deployment to different environments without code changes.`,
    },
    {
      hunkIds: [5],
      markdownDescription: `## Test Coverage

Added test case for the new NotFoundError behavior. The test ensures that requesting a non-existent user throws the appropriate error type.`,
    },
    {
      hunkIds: [6],
      markdownDescription: `## Database Migration

Adds audit fields to the users table:

- **created_at**: When the user was created
- **updated_at**: When the user was last modified  
- **deleted_at**: Soft delete timestamp (null for active users)

Includes a partial index on deleted_at for efficient queries on active users only.`,
    },
  ],
}

describe("ReviewAppView", () => {
  let testSetup: Awaited<ReturnType<typeof testRender>>

  afterEach(() => {
    if (testSetup) {
      testSetup.renderer.destroy()
    }
  })

  it("should render review groups with markdown descriptions and hunks", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={exampleHunks}
        reviewData={exampleReviewData}
        currentGroupIndex={0}
        isGenerating={false}
        themeName="github"
        width={80}
      />,
      {
        width: 80,
        height: 30,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchInlineSnapshot(`
"                                                                                
   Import changes                                                             █ 
                                                                              █ 
   Added logger import to support new logging functionality.                  █ 
                                                                              █ 
  #3 src/index.ts +1-0                                                        █ 
  1   import { main } from './utils'                                          █ 
  2 + import { logger } from './logger'                                       █ 
                                                                              █ 
                                                                              █ 
                                                                              █ 
                                                                              █ 
                                                                              █ 
                                                                              █ 
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
  <- prev                 q quit  j/k navigate  (1/2)                  next ->  
                                                                                
"
`)
  })

  it("should show loading state when no review data", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={exampleHunks}
        reviewData={null}
        currentGroupIndex={0}
        isGenerating={true}
        themeName="github"
        width={60}
      />,
      {
        width: 60,
        height: 10,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchInlineSnapshot(`
"                                                            
 Analyzing 3 hunks...                                       
 Waiting for AI to generate review...                       
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
"
`)
  })

  it("should show empty state when no hunks in review", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={exampleHunks}
        reviewData={{ hunks: [] }}
        currentGroupIndex={0}
        isGenerating={false}
        themeName="github"
        width={60}
      />,
      {
        width: 60,
        height: 10,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchInlineSnapshot(`
"                                                            
 No review groups generated                                 
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
"
`)
  })

  it("should show second group when navigating", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={exampleHunks}
        reviewData={exampleReviewData}
        currentGroupIndex={1}
        isGenerating={false}
        themeName="github"
        width={80}
      />,
      {
        width: 80,
        height: 35,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchInlineSnapshot(`
"                                                                                
   Input validation and logging                                               █ 
                                                                              █ 
   These changes add input validation to the helper function and integrate    █ 
   logging in the main function.                                              █ 
                                                                              █ 
  #1 src/utils.ts +3-1                                                        █ 
  10   function helper() {                                                    █ 
  11 -   return null                                                          █ 
  11 +   // Add validation                                                    █ 
  12 +   if (!input) return null                                              █ 
  13 +   return process(input)                                                █ 
  14   }                                                                      █ 
                                                                              █ 
  #2 src/utils.ts +2-0                                                        █ 
  27   export function main() {                                               █ 
  28 +   const result = helper()                                              ▀ 
  29 +   console.log(result)                                                    
  30     return result                                                          
  31   }                                                                        
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
                                                                                
  <- prev                 q quit  j/k navigate  (2/2)                  next ->  
                                                                                
"
`)
  })

  it("should use split view with wide terminal and show centered prose for multiple groups", async () => {
    // Width 160, height 60 - shows split view for hunks with both add/delete
    // Two prose parts to verify centering works for multiple groups
    testSetup = await testRender(
      <ReviewAppView
        hunks={exampleHunks}
        reviewData={exampleReviewData}
        currentGroupIndex={0}
        isGenerating={false}
        themeName="github"
        width={160}
      />,
      {
        width: 160,
        height: 60,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // First group: hunk #3 (only additions = unified view), prose centered
    expect(frame).toMatchInlineSnapshot(`
      "                                                                                                                                                                
                                               Import changes                                                                                                       █ 
                                                                                                                                                                    █ 
                                               Added logger import to support new logging functionality.                                                            █ 
                                                                                                                                                                    █ 
        #3 src/index.ts +1-0                                                                                                                                        █ 
        1   import { main } from './utils'                                                                                                                          █ 
        2 + import { logger } from './logger'                                                                                                                       █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
        <- prev                                                         q quit  j/k navigate  (1/2)                                                          next ->  
                                                                                                                                                                      
      "
    `)
  })

  it("should show split view for second group with mixed hunks", async () => {
    // Second group has hunk #1 (add+delete = split) and hunk #2 (only add = unified)
    testSetup = await testRender(
      <ReviewAppView
        hunks={exampleHunks}
        reviewData={exampleReviewData}
        currentGroupIndex={1}
        isGenerating={false}
        themeName="github"
        width={160}
      />,
      {
        width: 160,
        height: 60,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Hunk #1 should be split view (has both add and delete)
    // Hunk #2 should be unified view (only additions)
    expect(frame).toMatchInlineSnapshot(`
      "                                                                                                                                                                
                                               Input validation and logging                                                                                         █ 
                                                                                                                                                                    █ 
                                               These changes add input validation to the helper function and integrate                                              █ 
                                               logging in the main function.                                                                                        █ 
                                                                                                                                                                    █ 
        #1 src/utils.ts +3-1                                                                                                                                        █ 
        10   function helper() {                                                       10   function helper() {                                                     █ 
        11 -   return null                                                             11 +   // Add validation                                                     █ 
                                                                                       12 +   if (!input) return null                                               █ 
                                                                                       13 +   return process(input)                                                 █ 
        12   }                                                                         14   }                                                                       █ 
                                                                                                                                                                    █ 
        #2 src/utils.ts +2-0                                                                                                                                        █ 
        27   export function main() {                                                                                                                               █ 
        28 +   const result = helper()                                                                                                                              █ 
        29 +   console.log(result)                                                                                                                                  █ 
        30     return result                                                                                                                                        █ 
        31   }                                                                                                                                                      █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
        <- prev                                                         q quit  j/k navigate  (2/2)                                                          next ->  
                                                                                                                                                                      
      "
    `)
  })

  it("should render extended example with rich markdown prose - error classes", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={extendedHunks}
        reviewData={extendedReviewData}
        currentGroupIndex={0}
        isGenerating={false}
        themeName="github"
        width={160}
      />,
      {
        width: 160,
        height: 50,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Shows error classes with bullet points in prose
    expect(frame).toMatchInlineSnapshot(`
      "                                                                                                                                                                
                                               Custom Error Classes                                                                                                 █ 
                                                                                                                                                                    █ 
                                               Introduces two new error classes for better error handling across the                                                █ 
                                               application:                                                                                                         █ 
                                                                                                                                                                    █ 
                                               - **NotFoundError**: Used when a requested resource doesn't exist                                                    █ 
                                               - **ValidationError**: Used for input validation failures, includes the field                                        █ 
                                               name                                                                                                                 █ 
                                                                                                                                                                    █ 
                                               These errors enable more specific catch blocks and better error messages for                                         █ 
                                               API consumers.                                                                                                       █ 
                                                                                                                                                                    █ 
        #4 src/errors/index.ts +13-0                                                                                                                                █ 
         1 + export class NotFoundError extends Error {                                                                                                             █ 
         2 +   constructor(message: string) {                                                                                                                       █ 
         3 +     super(message)                                                                                                                                     █ 
         4 +     this.name = 'NotFoundError'                                                                                                                        █ 
         5 +   }                                                                                                                                                    █ 
         6 + }                                                                                                                                                      █ 
         7 +                                                                                                                                                        █ 
         8 + export class ValidationError extends Error {                                                                                                           █ 
         9 +   constructor(message: string, public field: string) {                                                                                                 █ 
        10 +     super(message)                                                                                                                                     █ 
        11 +     this.name = 'ValidationError'                                                                                                                        
        12 +   }                                                                                                                                                      
        13 + }                                                                                                                                                        
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
        <- prev                                                         q quit  j/k navigate  (1/5)                                                          next ->  
                                                                                                                                                                      
      "
    `)
  })

  it("should render extended example - API improvements with headings", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={extendedHunks}
        reviewData={extendedReviewData}
        currentGroupIndex={1}
        isGenerating={false}
        themeName="github"
        width={160}
      />,
      {
        width: 160,
        height: 60,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Shows API changes with multiple markdown headings
    expect(frame).toMatchInlineSnapshot(`
      "                                                                                                                                                                
                                               User API Improvements                                                                                                █ 
                                                                                                                                                                    █ 
                                               ### Error Handling                                                                                                   █ 
                                               The getUser function now properly handles missing users by throwing a                                                █ 
                                               NotFoundError instead of returning null. This makes the API behavior more                                            █ 
                                               predictable.                                                                                                         █ 
                                                                                                                                                                    █ 
                                               ### Security                                                                                                         █ 
                                               User data is now sanitized before being returned to prevent leaking sensitive                                        █ 
                                               fields.                                                                                                              █ 
                                                                                                                                                                    █ 
                                               ### Audit Logging                                                                                                    █ 
                                               The updateUser function now logs all updates for audit purposes. This helps                                          █ 
                                               with debugging and compliance requirements.                                                                          █ 
                                                                                                                                                                    █ 
        #1 src/api/users.ts +5-2                                                                                                                                    █ 
        15   export async function getUser(id: string) {                               15   export async function getUser(id: string) {                             █ 
        16 -   const user = await db.users.find(id)                                    16 +   const user = await db.users.find(id)                                  █ 
        17 -   return user                                                             17 +   if (!user) {                                                          █ 
                                                                                       18 +     throw new NotFoundError(\`User \${id} not found\`)                     █ 
                                                                                       19 +   }                                                                     █ 
                                                                                       20 +   return sanitizeUser(user)                                             █ 
        18   }                                                                         21   }                                                                       █ 
                                                                                                                                                                    █ 
        #2 src/api/users.ts +4-0                                                                                                                                    █ 
        40   export async function updateUser(id: string, data: UserUpdate) {                                                                                       █ 
        41 +   // Validate input before update                                                                                                                      █ 
        42 +   validateUserUpdate(data)                                                                                                                             █ 
        43 +                                                                                                                                                          
        44     const user = await db.users.update(id, data)                                                                                                           
        45 +   logger.info('User updated', { userId: id })                                                                                                            
        46     return user                                                                                                                                            
        47   }                                                                                                                                                        
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
        <- prev                                                         q quit  j/k navigate  (2/5)                                                          next ->  
                                                                                                                                                                      
      "
    `)
  })

  it("should render extended example - database migration", async () => {
    testSetup = await testRender(
      <ReviewAppView
        hunks={extendedHunks}
        reviewData={extendedReviewData}
        currentGroupIndex={4}
        isGenerating={false}
        themeName="github"
        width={160}
      />,
      {
        width: 160,
        height: 50,
      },
    )

    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Shows SQL migration with markdown list
    expect(frame).toMatchInlineSnapshot(`
      "                                                                                                                                                                
                                               Database Migration                                                                                                   █ 
                                                                                                                                                                    █ 
                                               Adds audit fields to the users table:                                                                                █ 
                                                                                                                                                                    █ 
                                               - **created_at**: When the user was created                                                                          █ 
                                               - **updated_at**: When the user was last modified                                                                    █ 
                                               - **deleted_at**: Soft delete timestamp (null for active users)                                                      █ 
                                                                                                                                                                    █ 
                                               Includes a partial index on deleted_at for efficient queries on active users                                         █ 
                                               only.                                                                                                                █ 
                                                                                                                                                                    █ 
        #6 migrations/001_add_audit_fields.sql +7-0                                                                                                                 █ 
        1 + -- Add audit fields to users table                                                                                                                      █ 
        2 + ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();                                                                                        █ 
        3 + ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();                                                                                        █ 
        4 + ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;                                                                                                      █ 
        5 +                                                                                                                                                         █ 
        6 + -- Create index for soft deletes                                                                                                                        █ 
        7 + CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;                                                                        █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                    █ 
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
                                                                                                                                                                      
        <- prev                                                         q quit  j/k navigate  (5/5)                                                          next ->  
                                                                                                                                                                      
      "
    `)
  })
})
