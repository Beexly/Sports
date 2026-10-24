from unittest import TestCase

from py_clob_client_v2.order_utils.utils import generate_order_salt


class TestGenerateOrderSalt(TestCase):
    def test_gets_a_salt(self):
        salt = generate_order_salt()
        self.assertIsNotNone(salt)
        self.assertNotEqual(salt, "")

    def test_gets_new_salt_each_time(self):
        for _ in range(100):
            self.assertNotEqual(generate_order_salt(), generate_order_salt())

    def test_all_salts_unique(self):
        salts = [generate_order_salt() for _ in range(100)]
        self.assertEqual(len(salts), len(set(salts)))
