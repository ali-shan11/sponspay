# Database Integration with TypeORM

## What is TypeORM?

TypeORM is an Object-Relational Mapping (ORM) library that allows you to work with databases using TypeScript/JavaScript objects instead of writing raw SQL queries.

## Why Use TypeORM with NestJS?

- **Type Safety**: Full TypeScript support with compile-time type checking
- **Database Agnostic**: Works with PostgreSQL, MySQL, SQLite, and more
- **Active Record & Data Mapper**: Flexible patterns for data access
- **Migrations**: Version control for database schema changes
- **Relations**: Easy handling of database relationships
- **Query Builder**: Powerful query construction

## Database Configuration in This Project

### TypeORM Configuration Service

```typescript
// From config/configuration.ts
@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}
  
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
      autoLoadEntities: true,  // Automatically load entities
      synchronize: this.configService.get<boolean>('DB_SYNC'),
      cache: true,  // Enable query result caching
      logging: this.configService.get<string>('NODE_ENV') !== 'production'
        ? 'all'
        : ['error'],
    };
  }
}
```

**Key Configuration Options:**
- `autoLoadEntities: true` - Automatically discovers and loads entity classes
- `synchronize` - Auto-creates database schema (use only in development)
- `cache: true` - Enables query result caching for better performance
- `logging` - Logs SQL queries in development, only errors in production

### Module Registration

```typescript
// From app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

## Entity Definition

### User Entity Example

```typescript
// From user/entities/user.entity.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  firebaseUid: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  userHandle: string;
}
```

**Key Decorators:**
- `@Entity()` - Marks class as a database entity
- `@PrimaryGeneratedColumn('uuid')` - Auto-generated UUID primary key
- `@Column({ unique: true })` - Database column with unique constraint
- `@IsNotEmpty()`, `@IsString()` - Validation decorators

### Advanced Entity Features

```typescript
@Entity('users') // Custom table name
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Virtual property
  @Column({ select: false }) // Exclude from default selects
  password: string;

  // Computed property
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

## Repository Pattern

### Repository Injection

```typescript
// In a service
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(userData: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, updateData: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
```

### Module Registration for Entities

```typescript
// In feature module
@Module({
  imports: [TypeOrmModule.forFeature([User])], // Register entity
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

## Common Repository Operations

### Basic CRUD Operations

```typescript
// Find operations
const users = await this.userRepository.find();
const user = await this.userRepository.findOne({ where: { id: '123' } });
const userByEmail = await this.userRepository.findOne({ where: { email: 'user@example.com' } });

// Create
const newUser = this.userRepository.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
const savedUser = await this.userRepository.save(newUser);

// Update
await this.userRepository.update({ id: '123' }, { firstName: 'Jane' });

// Delete
await this.userRepository.delete({ id: '123' });

// Soft delete (if using @DeleteDateColumn)
await this.userRepository.softDelete({ id: '123' });
```

### Advanced Queries

```typescript
// Find with relations
const userWithPosts = await this.userRepository.findOne({
  where: { id: '123' },
  relations: ['posts', 'profile']
});

// Find with conditions
const activeUsers = await this.userRepository.find({
  where: { isActive: true },
  order: { createdAt: 'DESC' },
  take: 10, // LIMIT
  skip: 0   // OFFSET
});

// Count
const userCount = await this.userRepository.count({
  where: { isActive: true }
});

// Exists
const userExists = await this.userRepository.exist({
  where: { email: 'user@example.com' }
});
```

### Query Builder

```typescript
// Complex queries with QueryBuilder
const users = await this.userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.isActive = :isActive', { isActive: true })
  .andWhere('post.publishedAt > :date', { date: new Date('2023-01-01') })
  .orderBy('user.createdAt', 'DESC')
  .getMany();

// Raw SQL when needed
const result = await this.userRepository.query(
  'SELECT COUNT(*) as count FROM users WHERE created_at > $1',
  [new Date('2023-01-01')]
);
```

## Entity Relationships

### One-to-Many Relationship

```typescript
// User entity
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

// Post entity
@Entity()
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column()
  authorId: string;
}
```

### Many-to-Many Relationship

```typescript
// User entity
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
  })
  roles: Role[];
}

// Role entity
@Entity()
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToMany(() => User, user => user.roles)
  users: User[];
}
```

### One-to-One Relationship

```typescript
// User entity
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Profile, profile => profile.user, { cascade: true })
  profile: Profile;
}

// Profile entity
@Entity()
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bio: string;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  user: User;
}
```

## Transactions

### Using QueryRunner

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async createUserWithProfile(userData: CreateUserDto, profileData: CreateProfileDto): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create user
      const user = queryRunner.manager.create(User, userData);
      const savedUser = await queryRunner.manager.save(user);

      // Create profile
      const profile = queryRunner.manager.create(Profile, {
        ...profileData,
        userId: savedUser.id
      });
      await queryRunner.manager.save(profile);

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### Using @Transaction Decorator

```typescript
import { Transaction, TransactionRepository } from 'typeorm';

@Injectable()
export class UserService {
  @Transaction()
  async createUserWithProfile(
    userData: CreateUserDto,
    profileData: CreateProfileDto,
    @TransactionRepository(User) userRepository: Repository<User>,
    @TransactionRepository(Profile) profileRepository: Repository<Profile>,
  ): Promise<User> {
    const user = userRepository.create(userData);
    const savedUser = await userRepository.save(user);

    const profile = profileRepository.create({
      ...profileData,
      userId: savedUser.id
    });
    await profileRepository.save(profile);

    return savedUser;
  }
}
```

## Database Migrations

### Creating Migrations

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n CreateUserTable

# Create empty migration
npm run typeorm migration:create -- -n AddUserIndexes
```

### Migration Example

```typescript
import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateUserTable1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      })
    );

    await queryRunner.createIndex('users', new Index('IDX_USER_EMAIL', ['email']));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Running Migrations

```bash
# Run pending migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert

# Show migration status
npm run typeorm migration:show
```

## Performance Optimization

### Query Optimization

```typescript
// Use select to limit fields
const users = await this.userRepository.find({
  select: ['id', 'name', 'email'],
  where: { isActive: true }
});

// Use pagination
const [users, total] = await this.userRepository.findAndCount({
  take: 10,
  skip: page * 10,
  order: { createdAt: 'DESC' }
});

// Eager loading vs lazy loading
const userWithPosts = await this.userRepository.findOne({
  where: { id: '123' },
  relations: ['posts'] // Eager loading
});
```

### Caching

```typescript
// Enable caching for specific queries
const users = await this.userRepository.find({
  where: { isActive: true },
  cache: {
    id: 'active_users',
    milliseconds: 60000 // Cache for 1 minute
  }
});

// Clear cache
await this.userRepository.clear();
```

### Indexes

```typescript
@Entity()
@Index(['email', 'isActive']) // Composite index
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index() // Single column index
  email: string;

  @Column()
  isActive: boolean;
}
```

## Testing with TypeORM

### Repository Testing

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should find all users', async () => {
    const users = [{ id: '1', name: 'John' }];
    jest.spyOn(repository, 'find').mockResolvedValue(users as User[]);

    const result = await service.findAll();
    expect(result).toEqual(users);
    expect(repository.find).toHaveBeenCalled();
  });
});
```

### Integration Testing with Test Database

```typescript
describe('UserService (Integration)', () => {
  let app: INestApplication;
  let userService: UserService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create and find user', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const user = await userService.create(userData);
    
    expect(user.id).toBeDefined();
    expect(user.name).toBe(userData.name);

    const foundUser = await userService.findOne(user.id);
    expect(foundUser).toEqual(user);
  });
});
```

## Best Practices

### 1. Entity Design

```typescript
// Good: Clear, focused entities
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index()
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. Repository Usage

```typescript
// Good: Use repository methods appropriately
const user = await this.userRepository.findOne({
  where: { email },
  select: ['id', 'email', 'name'] // Only select needed fields
});

// Avoid: N+1 queries
const users = await this.userRepository.find();
for (const user of users) {
  user.posts = await this.postRepository.find({ where: { userId: user.id } });
}

// Good: Use relations or joins
const users = await this.userRepository.find({
  relations: ['posts']
});
```

### 3. Error Handling

```typescript
async findUserByEmail(email: string): Promise<User> {
  try {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Database error occurred');
  }
}
```

## Next Steps

- Learn about [Environment Configuration](../configuration/environment-config.md)
- Understand [Project Structure](../architecture/project-structure.md)
- Explore [Testing Setup](../development/testing.md)

---

*TypeORM provides a powerful, type-safe way to interact with databases. Use entities to model your data, repositories for data access, and migrations for schema management.*