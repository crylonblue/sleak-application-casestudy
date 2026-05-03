import Link from 'next/link'
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface BreadcrumbItemType {
    title: string
    link?: string
}

export function SiteHeader({ breadcrumbs }: { breadcrumbs: BreadcrumbItemType[] }) {
    const renderBreadcrumbs = () => {
        if (breadcrumbs.length <= 3) {
            // Show all breadcrumbs normally
            return breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                        {item.link ? (
                            <BreadcrumbLink asChild>
                                <Link href={item.link}>{item.title}</Link>
                            </BreadcrumbLink>
                        ) : (
                            <BreadcrumbPage>{item.title}</BreadcrumbPage>
                        )}
                    </BreadcrumbItem>
                </div>
            ))
        }

        // Show first, ellipsis dropdown, and last two items
        const firstItem = breadcrumbs[0]
        const middleItems = breadcrumbs.slice(1, -2)
        const lastTwoItems = breadcrumbs.slice(-2)

        return (
            <>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href={firstItem.link || '/'}>{firstItem.title}</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                <BreadcrumbItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1">
                            <BreadcrumbEllipsis className="size-4" />
                            <span className="sr-only">Toggle menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {middleItems.map((item, index) => (
                                <DropdownMenuItem key={index} asChild>
                                    {item.link ? <Link href={item.link}>{item.title}</Link> : <span>{item.title}</span>}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                {lastTwoItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                            {item.link ? (
                                <BreadcrumbLink asChild>
                                    <Link href={item.link}>{item.title}</Link>
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{item.title}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </div>
                ))}
            </>
        )
    }

    return (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                <Breadcrumb>
                    <BreadcrumbList>{renderBreadcrumbs()}</BreadcrumbList>
                </Breadcrumb>

                <div className="ml-auto flex items-center gap-2" />
            </div>
        </header>
    )
}
