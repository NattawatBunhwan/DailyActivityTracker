type HeaderProps = {
  title: string
  description: string
}

function Header({ title, description }: HeaderProps) {
  return (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  )
}

export default Header