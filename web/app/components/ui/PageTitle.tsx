import React from 'react'

type PageTitleProps = {
    title: string,
    subtitle: string
};

const PageTitle = ({ title, subtitle }: PageTitleProps) => {
    return (
        <div>
            <h1 className='text-2xl font-bold tracking-tight text-slate-900'>
                {title}
            </h1>
            <p className='text-sm text-slate-500'>
                {subtitle}
            </p>
        </div>
    )
}

export default PageTitle