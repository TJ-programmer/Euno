from laya import Router


def main():
    print("Initializing Laya...")

    router = Router(preload=True)

    print("Laya initialized successfully.")
    print(router)


if __name__ == "__main__":
    main()
