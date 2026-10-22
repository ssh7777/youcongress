Application.put_env(:apx, :hall_classifier, APX.Halls.ClassificationFake)
Application.put_env(:apx, :embeddings_implementation, APX.Embeddings.Fake)

Application.put_env(
  :apx,
  :title_rewording_implementation,
  APX.Statements.TitleRewordingFake
)

Application.put_env(
  :apx,
  :quotator_implementation,
  APX.Opinions.Quotes.QuotatorFake
)

Application.put_env(
  :apx,
  :author_country_inference_implementation,
  APX.Authors.CountryInferenceFake
)

ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(APX.Repo, :manual)
ExUnit.configure(exclude: :openai_api)
