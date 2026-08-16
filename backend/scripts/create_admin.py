#!/usr/bin/env python3
import os
import getpass
from dotenv import load_dotenv
from app.database import db_manager, utc_now
from app.services.auth_service import auth_service

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))


def main():
    admin_email = os.getenv('ADMIN_EMAIL')
    admin_password = os.getenv('ADMIN_PASSWORD')

    if not admin_email:
        admin_email = input('ADMIN_EMAIL not set. Enter admin email: ').strip().lower()
    if not admin_password:
        admin_password = getpass.getpass('Enter ADMIN password (input hidden): ')

    admin_email = admin_email.strip().lower()
    if not admin_email or not admin_password:
        print('Admin email and password are required')
        return

    db_manager.connect()
    try:
        user = db_manager.collection('users').find_one({'email': admin_email})
        now = utc_now()
        password_hash = auth_service.hash_password(admin_password)
        if user:
            db_manager.collection('users').update_one({'_id': user['_id']}, {'$set': {'role': 'admin', 'email_verified': True, 'password_hash': password_hash, 'updated_at': now}})
            print(f'Updated existing account to admin: {admin_email}')
        else:
            user_doc = {
                'user_id': f'usr_{os.urandom(8).hex()}',
                'name': 'PhishGuard Administrator',
                'email': admin_email,
                'password_hash': password_hash,
                'role': 'admin',
                'email_verified': True,
                'alert_preferences': {},
                'created_at': now,
                'updated_at': now
            }
            db_manager.collection('users').insert_one(user_doc)
            print(f'Created admin account: {admin_email}')
    finally:
        db_manager.close()


if __name__ == '__main__':
    main()
