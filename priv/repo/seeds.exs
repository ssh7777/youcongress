# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#

defmodule APX.Seeds do
  alias APX.Accounts
  alias APX.Authors
  alias APX.Statements
  alias APX.Opinions
  alias APX.Votes

  def run do
    case {
      System.get_env("APX_SEED_DEMO"),
      System.get_env("APX_SEED_ADMIN_EMAIL"),
      System.get_env("APX_SEED_ADMIN_PASSWORD"),
      Application.get_env(:apx, :env)
    } do
      {"true", email, password, env} when is_binary(email) and email != "" and is_binary(password) and password != "" and env != :prod ->
        user = find_or_create_user(email, password)

        if user do
          authors = create_authors()
          statements = create_statements(user)
          create_opinions_and_votes(user, authors, statements)
        end

      _ ->
        IO.puts(
          "Skipping demo seeds. For a non-production database, set APX_SEED_DEMO=true and provide APX_SEED_ADMIN_EMAIL and APX_SEED_ADMIN_PASSWORD."
        )
    end
  end

  defp find_or_create_user(email, password) do
    user_attrs = %{
      "email" => email,
      "password" => password
    }

    author_attrs = %{
      "name" => "Admin",
      "bio" => "APX admin"
    }

    if user = Accounts.get_user_by_email(user_attrs["email"]) do
      IO.puts("User #{user_attrs["email"]} already exists.")
      user
    else
      create_user(user_attrs, author_attrs)
    end
  end

  defp create_user(user_attrs, author_attrs) do
    case Accounts.register_user(user_attrs, author_attrs) do
      {:ok, %{user: user}} ->
        IO.puts("User #{user_attrs["email"]} created successfully.")

        make_admin(user)

      {:error, changeset} ->
        IO.inspect(changeset, label: "Failed to create user")
        nil
    end
  end

  defp make_admin(user) do
    case Accounts.update_role(user, "admin") do
      {:ok, updated_user} ->
        IO.puts("User #{user.email} role updated to admin.")
        updated_user

      {:error, changeset} ->
        IO.inspect(changeset, label: "Failed to update role")
        user
    end
  end

  defp create_authors do
    [
      "Stuart J. Russell",
      "Demis Hassabis",
      "Scott Alexander",
      "Yoshua Bengio",
      "Eliezer Yudkowsky",
      "Yann LeCun",
      "Geoffrey Hinton",
      "Gary Marcus",
      "Dario Amodei",
      "Sam Altman",
      "Elon Musk",
      "Max Tegmark"
    ]
    |> Enum.map(fn name ->
      case Authors.find_by_name_or_create(%{
             "name" => name,
             "bio" => Faker.Person.title()
           }) do
        {:ok, author} ->
          IO.puts("Author #{name} created/found successfully.")
          author

        {:error, changeset} ->
          IO.inspect(changeset, label: "Failed to create author #{name}")
          nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end

  defp create_statements(user) do
    statements = [
      %{
        title: "Create a global institute for AI safety, similar to CERN",
        slug: "cern-for-ai"
      },
      %{
        title: "Mandatory third-party audits for major AI systems",
        slug: "mandatory-third-party-ai-audits"
      },
      %{
        title: "Require AI systems above a capability threshold to be interpretable",
        slug: "ai-interpretability-threshold"
      },
      %{
        title: "Ban autonomous lethal weapons",
        slug: "ban-autonomous-weapons"
      },
      %{
        title: "Ban open-source AI models capable of creating WMDs",
        slug: "open-source-ai-wmd-risk"
      }
    ]

    Enum.map(statements, fn statement ->
      case Statements.create_statement(%{
             "title" => statement.title,
             "slug" => statement.slug,
             "user_id" => user.id
           }) do
        {:ok, statement} ->
          IO.puts("Statement #{statement.title} created successfully.")
          statement

        {:error, %{errors: [title: {"has already been taken", _}]} = _changeset} ->
          IO.puts("Statement #{statement} already exists, fetching...")
          Statements.get_by(title: statement)

        {:error, changeset} ->
          IO.inspect(changeset, label: "Failed to create statement #{statement}")
          nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end

  defp create_opinions_and_votes(user, authors, statements) do
    for author <- authors, statement <- statements do
      opinion_attrs = %{
        "content" => Faker.Lorem.sentence(5..15) <> " (lorem ipsum)",
        "author_id" => author.id,
        "user_id" => user.id,
        "source_url" => Faker.Internet.url()
      }

      case Opinions.create_opinion(opinion_attrs) do
        {:ok, %{opinion: opinion}} ->
          IO.puts("Opinion for #{author.name} on '#{statement.title}' created.")

          case Opinions.add_opinion_to_statement(opinion, statement, user.id) do
            {:ok, _} ->
              IO.puts("Opinion linked to statement.")

              vote_attrs = %{
                "direct" => true,
                "twin" => false,
                "author_id" => author.id,
                "statement_id" => statement.id,
                "answer" => Enum.random([:for, :against, :abstain]),
                "opinion_id" => opinion.id
              }

              case Votes.create_vote(vote_attrs) do
                {:ok, _vote} -> IO.puts("Vote cast by #{author.name}.")
                {:error, changeset} -> IO.inspect(changeset, label: "Failed to create vote")
              end

            {:error, reason} ->
              IO.inspect(reason, label: "Failed to link opinion to statement")
          end

        {:error, changeset} ->
          IO.inspect(changeset, label: "Failed to create opinion")
      end
    end
  end
end

APX.Seeds.run()
