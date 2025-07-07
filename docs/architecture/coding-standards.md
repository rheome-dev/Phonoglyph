# Coding Standards

## TypeScript Standards

### Type Definitions
- Use strict TypeScript configuration with `noImplicitAny: true`
- Define interfaces for all data structures
- Use `const assertions` for literal types
- Prefer `interface` over `type` for object shapes
- Use `enum` for fixed sets of values

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
}

// ❌ Avoid
const user: any = { id: '123' };
```

### Naming Conventions
- **Variables/Functions:** camelCase (`getUserById`, `fileMetadata`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_ENDPOINTS`)
- **Types/Interfaces:** PascalCase (`User`, `FileMetadata`)
- **Files:** kebab-case (`file-upload.ts`, `user-auth.ts`)
- **Directories:** kebab-case (`components/auth`, `lib/file-validation`)

## React/Next.js Standards

### Component Structure
```tsx
// ✅ Preferred component structure
interface ComponentProps {
  id: string;
  onUpdate?: (data: SomeType) => void;
}

export function ComponentName({ id, onUpdate }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState<SomeType>();
  const { data } = useQuery(...);

  // Event handlers
  const handleClick = useCallback(() => {
    // implementation
  }, [dependencies]);

  // Early returns
  if (!data) return <LoadingSpinner />;

  // Main render
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
}
```

### Hooks Usage
- Always use `useCallback` for event handlers passed as props
- Use `useMemo` for expensive calculations
- Custom hooks should start with `use` prefix
- Extract complex logic into custom hooks

## API Standards (tRPC)

### Procedure Naming
```typescript
// ✅ Good - action-oriented names
export const userRouter = createTRPCRouter({
  getUserById: protectedProcedure.input(z.string()).query(...),
  updateUserProfile: protectedProcedure.input(UpdateUserSchema).mutation(...),
  deleteUserAccount: protectedProcedure.input(z.string()).mutation(...)
});
```

### Input Validation
- Always use Zod schemas for input validation
- Define reusable schemas in separate files
- Use descriptive error messages

```typescript
// ✅ Good - reusable schema
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  midiFilePath: z.string().min(1, "MIDI file is required"),
  renderConfiguration: z.record(z.any()).optional()
});
```

## Database Standards

### Query Patterns
- Use parameterized queries always (prevent SQL injection)
- Implement proper error handling
- Use transactions for multi-table operations
- Include created_at/updated_at timestamps

### Naming Conventions
```sql
-- ✅ Good - snake_case for database
CREATE TABLE "file_metadata" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

### API Error Responses
```typescript
// ✅ Consistent error structure
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'File size exceeds maximum limit',
  cause: { maxSize: MAX_FILE_SIZE, actualSize: file.size }
});
```

### Frontend Error Handling
```tsx
// ✅ User-friendly error display
const { mutate, error, isLoading } = api.file.upload.useMutation({
  onError: (error) => {
    toast.error(error.message || 'Upload failed. Please try again.');
  }
});
```

## Security Standards

### Authentication
- Always use `protectedProcedure` for user-specific operations
- Validate user ownership before data access
- Use Supabase RLS policies for database-level security

### File Handling
- Validate file types on both client and server
- Scan uploaded files for malware
- Use pre-signed URLs for S3 access
- Implement rate limiting on upload endpoints

## Performance Standards

### Frontend Optimization
- Use `React.memo` for expensive components
- Implement virtual scrolling for long lists
- Lazy load non-critical components
- Optimize bundle size with dynamic imports

### Backend Optimization
- Use database indexing for frequently queried fields
- Implement caching for expensive operations
- Use connection pooling for database connections
- Monitor API response times

## Testing Standards

### Unit Tests
- Test all business logic functions
- Mock external dependencies
- Use descriptive test names
- Aim for 80% coverage minimum

```typescript
// ✅ Good test structure
describe('FileUploadService', () => {
  it('should reject files exceeding size limit', async () => {
    const oversizedFile = createMockFile({ size: MAX_FILE_SIZE + 1 });
    
    await expect(validateFileSize(oversizedFile))
      .rejects
      .toThrow('File size exceeds maximum limit');
  });
});
```

### Integration Tests
- Test API endpoints end-to-end
- Include authentication scenarios
- Test error cases and edge conditions
- Use test database for isolation

## Documentation Standards

### Code Comments
- Use JSDoc for public functions
- Explain complex business logic
- Document API endpoints and parameters
- Keep comments up-to-date with code changes

### Commit Messages
```bash
# ✅ Good commit format
feat(auth): add Google OAuth integration
fix(upload): handle file size validation errors
docs(api): update tRPC router documentation
```

## Code Review Standards

### Required Checks
- [ ] TypeScript compilation without errors
- [ ] All tests passing
- [ ] Code follows naming conventions
- [ ] Security best practices implemented
- [ ] Performance considerations addressed
- [ ] Documentation updated if needed 