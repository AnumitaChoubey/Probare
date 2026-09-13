import rsa

def generate_keys():
    print("Generating RS256 keypair (2048-bit)...")
    public_key, private_key = rsa.newkeys(2048)
    
    with open("private.pem", "wb") as priv_file:
        priv_file.write(private_key.save_pkcs1("PEM"))
        
    with open("public.pem", "wb") as pub_file:
        pub_file.write(public_key.save_pkcs1("PEM"))
        
    print("Keys generated successfully:")
    print("- private.pem (keep secret, use on central API to sign tokens)")
    print("- public.pem (distribute with desktop app, use to verify tokens)")

if __name__ == "__main__":
    generate_keys()
