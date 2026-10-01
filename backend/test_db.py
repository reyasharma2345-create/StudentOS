from database import engine


try:
    with engine.connect() as connection:
        print("✅ Successfully connected to PostgreSQL!")
        print("🎓 StudentOS database connection is working!")

except Exception as error:
    print("❌ Database connection failed!")
    print(error)