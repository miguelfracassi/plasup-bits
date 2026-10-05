# PasUp
1. Suba esta pasta para um repositório no GitHub e importe na Vercel.
2. Em Storage, conecte um banco Neon (isso cria a variável DATABASE_URL).
3. Em Settings > Environment Variables, crie AUTH_SECRET com uma frase longa e aleatória.
4. Faça o deploy. As tabelas são criadas automaticamente no primeiro acesso.
5. Vakinha com Pix: em Settings > Environment Variables, crie MP_ACCESS_TOKEN com o Access Token de produção do Mercado Pago (Suas integrações > Credenciais). As tabelas da vakinha são criadas no primeiro acesso a /vakinhas/apoio-inicial. O webhook é configurado automaticamente em cada Pix, e a página também confere o pagamento sozinha a cada 4 segundos.
